import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '~/lib/prisma';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';
import { ensureDbAdminsInOrganization } from '~/lib/syncDbAdminsToClerkOrgs';

function extractClerkErrorMessage(error: unknown): string | null {
    if (!error || typeof error !== 'object') return null;
    const obj = error as {
        errors?: Array<{ message?: unknown; longMessage?: unknown; code?: unknown }>;
    };
    // Only parse Clerk-style payloads; avoid leaking internal Prisma/runtime errors.
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
        const first = obj.errors[0];
        const longMessage = typeof first.longMessage === 'string' ? first.longMessage.trim() : '';
        if (longMessage) return longMessage;
        const message = typeof first.message === 'string' ? first.message.trim() : '';
        if (message) return message;
        const code = typeof first.code === 'string' ? first.code.trim() : '';
        if (code) return `Clerk error: ${code}`;
    }
    return null;
}

async function createInvitationForOrganization(opts: {
    client: Awaited<ReturnType<typeof clerkClient>>;
    inviterUserId: string;
    emailRaw: string;
    trimmedName: string;
    targetOrganizationId: string;
    invitationRedirectUrl: string;
}): Promise<
    { ok: true; invitationId: string; organizationId: string } | { ok: false; error: string }
> {
    try {
        const {
            client,
            inviterUserId,
            emailRaw,
            trimmedName,
            targetOrganizationId,
            invitationRedirectUrl,
        } = opts;

        const org = await client.organizations.getOrganization({
            organizationId: targetOrganizationId,
        });
        const inviteRole = isDistributorPartnerOrgName(org.name) ? 'org:admin' : 'org:member';

        // Keep DB admins present in every partner org so Clerk invitation calls don't
        // get blocked by "current user is not a member".
        await ensureDbAdminsInOrganization(targetOrganizationId, 'org:member');

        const normalizedEmail = emailRaw.trim().toLowerCase();
        if (!isDistributorPartnerOrgName(org.name)) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: { equals: normalizedEmail, mode: 'insensitive' },
                },
                select: { role: true },
            });
            if (existingUser?.role === Role.ADMIN) {
                return {
                    ok: false,
                    error: 'This email belongs to a Food For Free administrator. Partner invitations are sent to partner accounts only.',
                };
            }
        }
        const metadataHouseholdId18 =
            typeof org.publicMetadata?.householdId18 === 'string'
                ? org.publicMetadata.householdId18.trim()
                : '';
        const partner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: org.id },
            select: { householdId18: true },
        });
        const householdId18 = metadataHouseholdId18 || partner?.householdId18?.trim() || '';

        if (!householdId18) {
            return { ok: false, error: 'This organization is missing a Household Id 18.' };
        }

        if (!metadataHouseholdId18) {
            try {
                await client.organizations.updateOrganizationMetadata(org.id, {
                    publicMetadata: { ...org.publicMetadata, householdId18 },
                });
            } catch {
                // Non-blocking metadata backfill; invitation can proceed without this update.
            }
        }

        // Update existing mapping only.
        // Some production DBs have extra required Partner columns not represented in Prisma
        // (e.g. required `id`), so create-path upserts can fail with null-constraint errors.
        const partnerUpdate = await prisma.partner.updateMany({
            where: { clerkOrganizationId: org.id },
            data: { organizationName: org.name, householdId18 },
        });
        if (partnerUpdate.count === 0) {
            return {
                ok: false,
                error: 'This organization is not mapped in the database yet. Create it from Manage organizations first.',
            };
        }

        const existingInvitations = await client.organizations.getOrganizationInvitationList({
            organizationId: targetOrganizationId,
            status: ['pending'],
            limit: 100,
        });
        const duplicatePendingInvite = existingInvitations.data.some(
            invitation => invitation.emailAddress.trim().toLowerCase() === normalizedEmail
        );
        if (duplicatePendingInvite) {
            return {
                ok: false,
                error: 'A pending invitation already exists for this email in this organization.',
            };
        }

        const invitation = await client.organizations.createOrganizationInvitation({
            organizationId: targetOrganizationId,
            emailAddress: emailRaw.trim(),
            inviterUserId,
            role: inviteRole,
            publicMetadata: trimmedName ? { inviteeName: trimmedName } : undefined,
            redirectUrl: invitationRedirectUrl,
        });

        return {
            ok: true,
            invitationId: invitation.id,
            organizationId: invitation.organizationId,
        };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return {
                ok: false,
                error: 'Organization mapping conflict detected. Check Household ID mapping for this organization.',
            };
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2011') {
            return {
                ok: false,
                error: 'Organization mapping is missing required fields in the database. Please repair the organization record first.',
            };
        }
        const clerkMsg = extractClerkErrorMessage(error);
        if (clerkMsg) {
            return { ok: false, error: clerkMsg };
        }
        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            if (
                msg.includes('already') &&
                (msg.includes('invitation') || msg.includes('invited'))
            ) {
                return {
                    ok: false,
                    error: 'A pending invitation already exists for this email in this organization.',
                };
            }
            if (msg.includes('organization') && msg.includes('not found')) {
                return { ok: false, error: 'Organization not found in Clerk.' };
            }
        }
        return { ok: false, error: 'Failed to create invitation for this organization.' };
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const body = await req.json();
        const { email, name, organizationId, organizationName, organizationIds } = body as {
            email?: string;
            name?: string;
            organizationId?: string;
            organizationName?: string;
            organizationIds?: string[];
        };
        const trimmedName = typeof name === 'string' ? name.trim() : '';

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const client = await clerkClient();
        const inviter = await client.users.getUser(userId);
        const inviterEmails = new Set(
            inviter.emailAddresses.map(e => e.emailAddress.trim().toLowerCase())
        );
        if (inviterEmails.has(email.trim().toLowerCase())) {
            return NextResponse.json(
                {
                    error: 'This email matches your Clerk account. Enter the address for the person you are inviting.',
                },
                { status: 400 }
            );
        }

        if (organizationName && !organizationId && !organizationIds?.length) {
            return NextResponse.json(
                {
                    error: 'Creating organizations from invites is disabled. Create the partner first with a Household Id 18.',
                },
                { status: 400 }
            );
        }

        const rawIds =
            Array.isArray(organizationIds) && organizationIds.length > 0
                ? organizationIds
                : organizationId
                  ? [organizationId]
                  : [];

        const uniqueOrgIds = [
            ...new Set(rawIds.map(id => (typeof id === 'string' ? id.trim() : '')).filter(Boolean)),
        ];

        if (uniqueOrgIds.length === 0) {
            return NextResponse.json(
                { error: 'At least one organization ID is required' },
                { status: 400 }
            );
        }

        const invitationRedirectUrl = new URL('/sign-up', req.nextUrl.origin).toString();

        const invitations: {
            id: string;
            emailAddress: string;
            organizationId: string;
            status: string;
        }[] = [];
        const errors: { organizationId: string; error: string }[] = [];

        for (const targetOrganizationId of uniqueOrgIds) {
            const result = await createInvitationForOrganization({
                client,
                inviterUserId: userId,
                emailRaw: email,
                trimmedName,
                targetOrganizationId,
                invitationRedirectUrl,
            });

            if (result.ok) {
                invitations.push({
                    id: result.invitationId,
                    emailAddress: email.trim(),
                    organizationId: result.organizationId,
                    status: 'pending',
                });
            } else {
                errors.push({ organizationId: targetOrganizationId, error: result.error });
            }
        }

        if (invitations.length === 0) {
            const firstError = errors[0]?.error ?? 'Failed to create invitations';
            return NextResponse.json(
                { error: firstError, errors },
                { status: errors.some(e => e.error.includes('pending invitation')) ? 409 : 400 }
            );
        }

        return NextResponse.json({
            invitations,
            errors: errors.length > 0 ? errors : undefined,
            invitation: invitations[0],
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Organization mapping conflict detected. Check Household ID mapping.' },
                { status: 409 }
            );
        }
        const clerkMsg = extractClerkErrorMessage(error);
        if (clerkMsg) {
            return NextResponse.json({ error: clerkMsg }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}
