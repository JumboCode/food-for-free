import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

export type OverviewScope =
    | { kind: 'unauthenticated' }
    | { kind: 'no_db_user' }
    | { kind: 'partner_no_org' }
    | { kind: 'admin'; destination: string | undefined }
    | { kind: 'partner'; destination: string };

/**
 * Resolves which destination/org name overview metrics apply to.
 * Admins may pass ?destination= for any org; partners are always scoped to their linked Partner row.
 */
export async function getOverviewScope(
    requestedDestination: string | null | undefined
): Promise<OverviewScope> {
    const { userId } = await auth();
    if (!userId) return { kind: 'unauthenticated' };

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { partner: true },
    });
    if (!user) return { kind: 'no_db_user' };

    if (user.role === 'ADMIN') {
        const d = requestedDestination?.trim();
        const destination = d && d !== 'All Organizations' ? d : undefined;
        return { kind: 'admin', destination };
    }

    const orgName = user.partner?.organizationName?.trim();
    if (!orgName) return { kind: 'partner_no_org' };

    return { kind: 'partner', destination: orgName };
}

/** Partner-scoped filter for All* metrics (householdName) and InventoryTransaction.destination when set. */
export function scopeToPartnerFilter(scope: OverviewScope): string | undefined {
    if (scope.kind === 'admin') return scope.destination;
    if (scope.kind === 'partner') return scope.destination;
    return undefined;
}

export function overviewScopeErrorResponse(scope: OverviewScope): NextResponse | null {
    if (scope.kind === 'unauthenticated' || scope.kind === 'no_db_user') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (scope.kind === 'partner_no_org') {
        return NextResponse.json(
            { error: 'No organization is assigned to your account yet.' },
            { status: 403 }
        );
    }
    return null;
}
