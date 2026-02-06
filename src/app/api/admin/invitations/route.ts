import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

async function requireAdmin(userId: string) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const isAdmin = user.publicMetadata?.role === 'admin';

    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
    }

    return user;
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin(userId);

        const body = await req.json();
        const { email, organizationId, organizationName } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Validate that at least one of organizationId or organizationName is provided
        if (!organizationId && !organizationName) {
            return NextResponse.json(
                { error: 'Either organizationId or organizationName must be provided' },
                { status: 400 }
            );
        }

        // Reject if both are provided (ambiguous)
        if (organizationId && organizationName) {
            return NextResponse.json(
                { error: 'Provide either organizationId or organizationName, not both' },
                { status: 400 }
            );
        }

        const client = await clerkClient();
        let targetOrganizationId = organizationId;

        // If organizationName is provided, create the organization first
        if (organizationName) {
            try {
                // Check if organization already exists
                const slug = organizationName.toLowerCase().replace(/\s+/g, '-');

                try {
                    const existing = await client.organizations.getOrganization({ slug });
                    return NextResponse.json(
                        { error: 'Organization with this name already exists' },
                        { status: 409 }
                    );
                } catch {
                    // Organization doesn't exist, proceed with creation
                }

                const newOrg = await client.organizations.createOrganization({
                    name: organizationName,
                    createdBy: userId,
                });

                targetOrganizationId = newOrg.id;
            } catch (error) {
                console.error('Error creating organization:', error);
                return NextResponse.json(
                    { error: 'Failed to create organization' },
                    { status: 500 }
                );
            }
        }

        // Create invitation
        const invitation = await client.organizations.createOrganizationInvitation({
            organizationId: targetOrganizationId!,
            emailAddress: email,
            inviterUserId: userId,
            role: 'org:member',
        });

        return NextResponse.json({
            invitation: {
                id: invitation.id,
                emailAddress: invitation.emailAddress,
                organizationId: invitation.organizationId,
                status: invitation.status,
            },
        });
    } catch (error) {
        console.error('Error creating invitation:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}
