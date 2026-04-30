import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { syncNeonUserRoleFromClerkOrgs } from '~/lib/syncNeonUserRoleFromClerkOrgs';

/**
 * Partner self-service: leave a single Clerk organization (cannot leave your only membership).
 */
export async function POST(_req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await _req.json()) as { organizationId?: string };
        const organizationId =
            typeof body.organizationId === 'string' ? body.organizationId.trim() : '';
        if (!organizationId) {
            return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
        }

        const client = await clerkClient();
        const membershipList = await client.users.getOrganizationMembershipList({
            userId,
            limit: 100,
        });

        const memberships = membershipList.data ?? [];
        const isMember = memberships.some(m => m.organization.id === organizationId);
        if (!isMember) {
            return NextResponse.json(
                { error: 'You are not a member of this organization.' },
                { status: 400 }
            );
        }

        if (memberships.length <= 1) {
            return NextResponse.json(
                {
                    error: 'You cannot leave your only organization from here. Ask an administrator.',
                },
                { status: 400 }
            );
        }

        await client.organizations.deleteOrganizationMembership({
            organizationId,
            userId,
        });

        await syncNeonUserRoleFromClerkOrgs(userId);

        const suggestedActiveOrganizationId =
            memberships.find(m => m.organization.id !== organizationId)?.organization.id ?? null;

        return NextResponse.json({
            success: true,
            suggestedActiveOrganizationId,
        });
    } catch (err) {
        console.error('leave-organization:', err);
        return NextResponse.json({ error: 'Failed to leave organization' }, { status: 500 });
    }
}
