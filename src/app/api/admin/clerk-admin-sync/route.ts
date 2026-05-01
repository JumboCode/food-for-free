import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { ensureDbAdminsAcrossAllOrganizations } from '~/lib/syncDbAdminsToClerkOrgs';

/**
 * POST /api/admin/clerk-admin-sync
 * One-time/manual sync: ensure all DB ADMIN users are org:admin across all Clerk orgs.
 */
export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await requireAdmin();

        const result = await ensureDbAdminsAcrossAllOrganizations('org:admin');
        return NextResponse.json({
            success: true,
            organizationsProcessed: result.organizationsProcessed,
            membershipsCreated: result.membershipsCreated,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: 'Failed to sync Clerk admin memberships' },
            { status: 500 }
        );
    }
}
