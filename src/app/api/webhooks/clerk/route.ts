import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { clerkClient, WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '~/lib/prisma';
import { syncUserPartnerFromClerkOrgMemberships } from '~/lib/syncUserPartnerFromClerk';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function upsertNeonUserFromClerk(userId: string): Promise<void> {
    const client = await clerkClient();
    const cu = await client.users.getUser(userId);
    const primaryId = cu.primaryEmailAddressId;
    const email =
        cu.emailAddresses.find(e => e.id === primaryId)?.emailAddress ??
        cu.emailAddresses[0]?.emailAddress ??
        `clerk-${userId}@placeholder.invalid`;
    const role = ADMIN_EMAIL && email === ADMIN_EMAIL ? 'ADMIN' : 'PARTNER';
    await prisma.user.upsert({
        where: { clerkId: userId },
        create: {
            clerkId: userId,
            email,
            role,
        },
        update: { email },
    });
}

/** Resolve email + role from user.created / user.updated payload (no extra Clerk API call). */
function emailAndRoleFromUserPayload(data: { email_addresses?: { email_address: string }[] }): {
    email: string;
    role: 'ADMIN' | 'PARTNER';
} {
    const email = data.email_addresses?.[0]?.email_address ?? '';
    const role = ADMIN_EMAIL && email === ADMIN_EMAIL ? 'ADMIN' : 'PARTNER';
    return { email, role };
}

/**
 * Ensure Neon User exists and is linked to Partner for this Clerk organization id.
 */
async function assignPartnerByClerkOrgId(
    userId: string,
    clerkOrganizationId: string
): Promise<void> {
    await upsertNeonUserFromClerk(userId);

    const partner = await prisma.partner.findUnique({
        where: { clerkOrganizationId: clerkOrganizationId },
    });

    if (!partner) {
        console.warn('Partner not found for Clerk organization:', clerkOrganizationId);
        return;
    }

    await prisma.user.update({
        where: { clerkId: userId },
        data: { partnerId: partner.id },
    });
    console.log('User assigned to partner:', userId, '→', partner.organizationName);
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
            const { id, email_addresses } = evt.data as {
                id: string;
                email_addresses?: { email_address: string }[];
            };
            const { email, role } = emailAndRoleFromUserPayload({ email_addresses });

            await prisma.user.upsert({
                where: { clerkId: id },
                create: {
                    clerkId: id,
                    email,
                    role,
                },
                update: {
                    email,
                    role,
                },
            });

            await syncUserPartnerFromClerkOrgMemberships(id);

            console.log(`${eventType}:`, id, 'Role:', role);
        }

        // Invite accepted: reliable path for Neon user + partner link (often the only event apps subscribe to).
        if (eventType === 'organizationInvitation.accepted') {
            const d = evt.data as {
                user_id?: string;
                organization_id?: string;
            };
            const userId = d.user_id;
            const organizationId = d.organization_id;
            if (!userId || !organizationId) {
                console.error(
                    'organizationInvitation.accepted: missing user_id or organization_id',
                    JSON.stringify(d)
                );
            } else {
                await assignPartnerByClerkOrgId(userId, organizationId);
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
                });

                if (user?.partnerId) {
                    const partner = await prisma.partner.findUnique({
                        where: { id: user.partnerId },
                    });

                    if (
                        partner &&
                        organization?.id &&
                        partner.clerkOrganizationId === organization.id
                    ) {
                        await prisma.user.update({
                            where: { clerkId: userId },
                            data: { partnerId: null },
                        });
                        console.log(
                            'User removed from partner organization:',
                            userId,
                            organization.name
                        );
                    }
                }
            }
        }

        // If user.* / invitation / membership webhooks were missed, first session still creates Neon row
        // or repairs partnerId when the user exists but was never linked.
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
                    console.log('session.created: backfilled Neon user', userId);
                } else if (!existing.partnerId) {
                    if (d.last_active_organization_id) {
                        await assignPartnerByClerkOrgId(userId, d.last_active_organization_id);
                    } else {
                        await syncUserPartnerFromClerkOrgMemberships(userId);
                    }
                    console.log('session.created: repaired partner link', userId);
                }
            }
        }
    } catch (err) {
        console.error(`Clerk webhook handler error (${eventType}):`, err);
        return new Response('Handler error', { status: 500 });
    }

    return new Response('Webhook processed', { status: 200 });
}
