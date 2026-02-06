import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Check if user is admin
async function requireAdmin(userId: string) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const isAdmin = user.publicMetadata?.role === 'admin';

    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
    }

    return user;
}

// GET - List all organizations
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin(userId);

        const client = await clerkClient();

        // Get all organizations
        const organizationsResponse = await client.organizations.getOrganizationList({
            limit: 100,
        });

        // Get member counts for each organization
        const organizationsWithCounts = await Promise.all(
            organizationsResponse.data.map(async org => {
                const memberships = await client.organizations.getOrganizationMembershipList({
                    organizationId: org.id,
                });

                return {
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                    membersCount: memberships.data.length,
                    createdAt: org.createdAt.toString(),
                };
            })
        );

        return NextResponse.json({
            organizations: organizationsWithCounts,
            total: organizationsResponse.totalCount,
        });
    } catch (error) {
        console.error('Error fetching organizations:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }
}

// POST - Create new organization
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin(userId);

        const body = await req.json();
        const { name, slug } = body;

        if (!name) {
            return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
        }

        const client = await clerkClient();

        // Check if organization with this slug already exists
        if (slug) {
            try {
                const existing = await client.organizations.getOrganization({ slug });
                if (existing) {
                    return NextResponse.json(
                        { error: 'Organization with this slug already exists' },
                        { status: 409 }
                    );
                }
            } catch (error) {
                // Organization doesn't exist, which is what we want
            }
        }

        // Create organization
        const organization = await client.organizations.createOrganization({
            name,
            slug: slug || undefined,
            createdBy: userId,
        });

        return NextResponse.json({
            organization: {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                membersCount: 1, // Creator is automatically a member
                createdAt: organization.createdAt.toString(),
            },
        });
    } catch (error) {
        console.error('Error creating organization:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }
}
