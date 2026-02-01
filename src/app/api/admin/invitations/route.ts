import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/../lib/prisma';

/**
 * POST /api/admin/invitations
 * Send a Clerk invitation to a user email and invite them to a Clerk Organization
 * Body: { email: string, organizationName?: string }
 */
export async function POST(req: Request) {
    try {
        await requireAdmin();

        const body = await req.json();
        const { email, organizationName } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const clerk = await clerkClient();

        // Get or create Clerk Organization and Partner
        let partner;
        let clerkOrg;

        if (organizationName) {
            // Create new Clerk Organization
            clerkOrg = await clerk.organizations.createOrganization({
                name: organizationName,
                slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
            });

            // Create Partner record linked to Clerk Organization
            partner = await prisma.partner.create({
                data: {
                    organizationName,
                    clerkOrganizationId: clerkOrg.id,
                },
            });
        } else {
            return NextResponse.json({ error: 'Organization Name is required' }, { status: 400 });
        }

        // Check if user already exists in Clerk
        try {
            const existingUsers = await clerk.users.getUserList({
                emailAddress: [email],
            });

            if (existingUsers.data.length > 0) {
                const userId = existingUsers.data[0].id;

                // Check if user is already a member of this organization
                const memberships = await clerk.organizations.getOrganizationMembershipList({
                    organizationId: clerkOrg.id,
                });

                const isAlreadyMember = memberships.data.some(
                    member => member.publicUserData?.userId === userId
                );

                if (isAlreadyMember) {
                    return NextResponse.json(
                        { error: 'User is already a member of this organization' },
                        { status: 400 }
                    );
                }

                // User exists but not in this org - add them directly
                await clerk.organizations.createOrganizationMembership({
                    organizationId: clerkOrg.id,
                    userId,
                    role: 'org:member',
                });

                return NextResponse.json({
                    success: true,
                    message: 'User added to organization',
                    organization: {
                        id: clerkOrg.id,
                        name: clerkOrg.name,
                    },
                    partner: {
                        id: partner.id,
                        organizationName: partner.organizationName,
                    },
                });
            }
        } catch (err) {
            // User doesn't exist yet, continue with invitation
            console.error('Error checking existing user:', err);
        }

        // Create invitation to the organization
        const invitation = await clerk.organizations.createOrganizationInvitation({
            organizationId: clerkOrg.id,
            emailAddress: email,
            role: 'org:member',
        });

        return NextResponse.json({
            success: true,
            invitation: {
                id: invitation.id,
                email: invitation.emailAddress,
                status: invitation.status,
            },
            organization: {
                id: clerkOrg.id,
                name: clerkOrg.name,
            },
            partner: {
                id: partner.id,
                organizationName: partner.organizationName,
            },
        });
    } catch (error: unknown) {
        console.error('Error creating invitation:', error);
        if (error instanceof Error && error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 403 }
            );
        }
        const errorMessage = error instanceof Error ? error.message : 'Failed to create invitation';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

/**
 * GET /api/admin/invitations
 * List all pending organization invitations (from Clerk)
 */
export async function GET() {
    try {
        await requireAdmin();

        const clerk = await clerkClient();

        // Get all organizations
        const organizations = await clerk.organizations.getOrganizationList();

        // Get pending invitations for each organization
        const allInvitations = [];
        for (const org of organizations.data) {
            try {
                const invitations = await clerk.organizations.getOrganizationInvitationList({
                    organizationId: org.id,
                });
                // Filter for pending invitations
                const pendingInvitations = invitations.data.filter(inv => inv.status === 'pending');
                allInvitations.push(
                    ...pendingInvitations.map(inv => ({
                        id: inv.id,
                        email: inv.emailAddress,
                        status: inv.status,
                        createdAt: inv.createdAt,
                        organizationId: org.id,
                        organizationName: org.name,
                    }))
                );
            } catch (err) {
                // Skip organizations without invitations
                console.error(`Error fetching invitations for org ${org.id}:`, err);
            }
        }

        return NextResponse.json({
            invitations: allInvitations,
        });
    } catch (error: unknown) {
        console.error('Error fetching invitations:', error);
        if (error instanceof Error && error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 403 }
            );
        }
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invitations';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
