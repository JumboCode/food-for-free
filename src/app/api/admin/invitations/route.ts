import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { Role } from '@prisma/client';
import { prisma } from '~/lib/prisma';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

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

    await prisma.partner.upsert({
        where: { clerkOrganizationId: org.id },
        update: { organizationName: org.name, householdId18 },
        create: {
            householdId18,
            organizationName: org.name,
            clerkOrganizationId: org.id,
        },
    });

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
        console.error('Error creating invitation:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}
