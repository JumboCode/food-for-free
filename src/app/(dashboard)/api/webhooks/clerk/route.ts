import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/../lib/prisma';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(req: Request) {
    // Get Clerk webhook secret from environment
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        throw new Error('Missing CLERK_WEBHOOK_SECRET');
    }

    // Get headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Missing svix headers', { status: 400 });
    }

    // Get body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Verify webhook signature
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

    // Handle user created
    if (eventType === 'user.created') {
        const { id, email_addresses } = evt.data;
        const email = email_addresses[0]?.email_address || '';

        // Determine role based on email (if ADMIN_EMAIL is configured)
        const role = ADMIN_EMAIL && email === ADMIN_EMAIL ? 'ADMIN' : 'PARTNER';

        await prisma.user.upsert({
            where: { clerkId: id },
            create: {
                clerkId: id,
                email,
                role: role,
            },
            update: {
                email,
                role: role,
            },
        });

        console.log('User created:', id, 'Role:', role);
    }

    // Handle organization membership created (user joined an organization)
    if (eventType === 'organizationMembership.created') {
        const { organization, public_user_data } = evt.data;
        const userId = public_user_data?.user_id;

        if (!userId || !organization) {
            console.error('Missing userId or organization in webhook');
            return new Response('Missing data', { status: 400 });
        }

        // Find partner by Clerk organization ID
        const partner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: organization.id },
        });

        if (partner) {
            // Update user's partner assignment
            const user = await prisma.user.findUnique({
                where: { clerkId: userId },
            });

            if (user) {
                await prisma.user.update({
                    where: { clerkId: userId },
                    data: { partnerId: partner.id },
                });
                console.log('User assigned to partner:', userId, '→', partner.organizationName);
            }
        } else {
            console.warn('Partner not found for Clerk organization:', organization.id);
        }
    }

    // Handle organization membership deleted (user removed from organization)
    // This fires when:
    // 1. Admin removes user from organization (via Dashboard or API)
    // 2. User leaves organization (if allowed)
    // 3. Organization is deleted
    // 4. User account is deleted
    if (eventType === 'organizationMembership.deleted') {
        const { organization, public_user_data } = evt.data;
        const userId = public_user_data?.user_id;

        if (userId) {
            const user = await prisma.user.findUnique({
                where: { clerkId: userId },
            });

            if (user && user.partnerId) {
                const partner = await prisma.partner.findUnique({
                    where: { id: user.partnerId },
                });

                // Only remove partner assignment if they left/removed from this specific organization
                if (partner && partner.clerkOrganizationId === organization.id) {
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

    return new Response('Webhook processed', { status: 200 });
}
