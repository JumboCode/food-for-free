import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { clerkClient, WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '~/lib/prisma';
import { syncUserPartnerFromClerkOrgMemberships } from '~/lib/syncUserPartnerFromClerk';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

function normalizeEmail(email: string | null | undefined): string {
    return email?.trim().toLowerCase() ?? '';
}

async function upsertNeonUserFromClerk(userId: string): Promise<void> {
    const client = await clerkClient();
    const cu = await client.users.getUser(userId);
    const primaryId = cu.primaryEmailAddressId;
    const email =
        cu.emailAddresses.find(e => e.id === primaryId)?.emailAddress ??
        cu.emailAddresses[0]?.emailAddress ??
        `clerk-${userId}@placeholder.invalid`;
    const name = [cu.firstName, cu.lastName].filter(Boolean).join(' ').trim() || null;
    const role = ADMIN_EMAIL && email === ADMIN_EMAIL ? 'ADMIN' : 'PARTNER';
    await prisma.user.upsert({
        where: { clerkId: userId },
        create: {
            clerkId: userId,
            name,
            email,
            role,
        },
        update: { name, email },
    });
}

/** Resolve email + role from user.created / user.updated payload (no extra Clerk API call). */
function userFieldsFromPayload(data: {
    email_addresses?: { email_address: string }[];
    first_name?: string | null;
    last_name?: string | null;
}): {
    email: string;
    name: string | null;
} {
    const email = data.email_addresses?.[0]?.email_address ?? '';
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || null;
    return { email, name };
}

function roleFromEmail(email: string): 'ADMIN' | 'PARTNER' {
    return ADMIN_EMAIL && email === ADMIN_EMAIL ? 'ADMIN' : 'PARTNER';
}

async function isFoodForFreeOrganization(clerkOrganizationId: string): Promise<boolean> {
    const partner = await prisma.partner.findUnique({
        where: { clerkOrganizationId },
        select: { organizationName: true },
    });
    return isDistributorPartnerOrgName(partner?.organizationName);
}

async function userHasVerifiedEmail(userId: string, email: string): Promise<boolean> {
    const target = normalizeEmail(email);
    if (!target) return false;
    const client = await clerkClient();
    const cu = await client.users.getUser(userId);
    return cu.emailAddresses.some(addr => {
        const matches = normalizeEmail(addr.emailAddress) === target;
        const verified = addr.verification?.status === 'verified';
        return matches && verified;
    });
}

async function rollbackMembershipForEmailMismatch(
    userId: string,
    organizationId: string
): Promise<void> {
    const client = await clerkClient();
    try {
        await client.organizations.deleteOrganizationMembership({
            organizationId,
            userId,
        });
    } catch (clerkErr) {
        const status = (clerkErr as { status?: number }).status;
        if (status !== 404) throw clerkErr;
    }
    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
    });
    if (user) {
        const partner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: organizationId },
            select: { householdId18: true },
        });
        if (partner) {
            await prisma.userPartnerMembership.deleteMany({
                where: { userId: user.id, partnerId: partner.householdId18 },
            });
        }
    }
}

/**
 * Ensure Neon User exists and is linked to Partner for this Clerk organization id.
 */
async function assignPartnerByClerkOrgId(
    userId: string,
    clerkOrganizationId: string
): Promise<void> {
    await upsertNeonUserFromClerk(userId);
    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
    });
    if (!user) return;

    const partner = await prisma.partner.findUnique({
        where: { clerkOrganizationId: clerkOrganizationId },
    });

    if (!partner) return;

    await prisma.userPartnerMembership.upsert({
        where: {
            userId_partnerId: {
                userId: user.id,
                partnerId: partner.householdId18,
            },
        },
        create: {
            userId: user.id,
            partnerId: partner.householdId18,
        },
        update: {},
    });
}

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        throw new Error('Missing CLERK_WEBHOOK_SECRET');
    }

    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Missing svix headers', { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error('Webhook verification failed:', err);
        return new Response('Invalid signature', { status: 400 });
    }

    const eventType = evt.type;

    try {
        if (eventType === 'user.created' || eventType === 'user.updated') {
            const { id, email_addresses, first_name, last_name } = evt.data as {
                id: string;
                email_addresses?: { email_address: string }[];
                first_name?: string | null;
                last_name?: string | null;
            };
            const { email, name } = userFieldsFromPayload({
                email_addresses,
                first_name,
                last_name,
            });
            const existing = await prisma.user.findUnique({
                where: { clerkId: id },
                select: { role: true },
            });
            const nextRole = existing?.role === 'ADMIN' ? 'ADMIN' : roleFromEmail(email || '');

            await prisma.user.upsert({
                where: { clerkId: id },
                create: {
                    clerkId: id,
                    name,
                    email,
                    role: nextRole,
                },
                update: {
                    name,
                    email,
                    role: nextRole,
                },
            });

            await syncUserPartnerFromClerkOrgMemberships(id);
        }

        if (eventType === 'user.deleted') {
            const d = evt.data as { id?: string };
            const deletedClerkUserId = d.id;
            if (!deletedClerkUserId) {
                console.error('user.deleted: missing id', JSON.stringify(d));
            } else {
                await prisma.user.deleteMany({
                    where: { clerkId: deletedClerkUserId },
                });
            }
        }

        // Invite accepted: reliable path for Neon user + partner link (often the only event apps subscribe to).
        if (eventType === 'organizationInvitation.accepted') {
            const d = evt.data as {
                user_id?: string;
                organization_id?: string;
                email_address?: string;
            };
            const userId = d.user_id;
            const organizationId = d.organization_id;
            const invitedEmail = normalizeEmail(d.email_address);
            if (!userId || !organizationId) {
                console.error(
                    'organizationInvitation.accepted: missing user_id or organization_id',
                    JSON.stringify(d)
                );
            } else {
                if (!invitedEmail) {
                    console.error(
                        'organizationInvitation.accepted: missing invited email address',
                        JSON.stringify(d)
                    );
                } else {
                    const hasInviteEmail = await userHasVerifiedEmail(userId, invitedEmail);
                    if (!hasInviteEmail) {
                        await rollbackMembershipForEmailMismatch(userId, organizationId);
                        return new Response('Invitation email mismatch', { status: 200 });
                    }
                }
                await assignPartnerByClerkOrgId(userId, organizationId);
                if (await isFoodForFreeOrganization(organizationId)) {
                    await prisma.user.update({
                        where: { clerkId: userId },
                        data: { role: 'ADMIN' },
                    });
                }
            }
        }

        if (eventType === 'organizationMembership.created') {
            const { organization, public_user_data } = evt.data as {
                organization?: { id: string; name?: string };
                public_user_data?: { user_id?: string };
            };
            const userId = public_user_data?.user_id;

            if (!userId || !organization?.id) {
                console.error('organizationMembership.created: missing userId or organization');
                return new Response('Missing data', { status: 400 });
            }

            await assignPartnerByClerkOrgId(userId, organization.id);
            if (await isFoodForFreeOrganization(organization.id)) {
                await prisma.user.update({
                    where: { clerkId: userId },
                    data: { role: 'ADMIN' },
                });
            }
        }

        if (eventType === 'organizationMembership.deleted') {
            const { organization, public_user_data } = evt.data as {
                organization?: { id: string; name?: string };
                public_user_data?: { user_id?: string };
            };
            const userId = public_user_data?.user_id;

            if (userId) {
                const user = await prisma.user.findUnique({
                    where: { clerkId: userId },
                    select: { id: true },
                });

                if (user && organization?.id) {
                    const partner = await prisma.partner.findUnique({
                        where: { clerkOrganizationId: organization.id },
                    });

                    if (partner) {
                        await prisma.userPartnerMembership.deleteMany({
                            where: {
                                userId: user.id,
                                partnerId: partner.householdId18,
                            },
                        });
                    }
                }
            }
        }

        // If user.* / invitation / membership webhooks were missed, first session still creates Neon row
        // or repairs partner memberships when the user exists but was never linked.
        if (eventType === 'session.created') {
            const d = evt.data as {
                user_id?: string;
                last_active_organization_id?: string;
            };
            const userId = d.user_id;
            if (userId) {
                const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
                if (!existing) {
                    await upsertNeonUserFromClerk(userId);
                    if (d.last_active_organization_id) {
                        await assignPartnerByClerkOrgId(userId, d.last_active_organization_id);
                    } else {
                        await syncUserPartnerFromClerkOrgMemberships(userId);
                    }
                } else {
                    if (d.last_active_organization_id) {
                        await assignPartnerByClerkOrgId(userId, d.last_active_organization_id);
                    } else {
                        await syncUserPartnerFromClerkOrgMemberships(userId);
                    }
                }
            }
        }
    } catch (err) {
        console.error(`Clerk webhook handler error (${eventType}):`, err);
        return new Response('Handler error', { status: 500 });
    }

    return new Response('Webhook processed', { status: 200 });
}
