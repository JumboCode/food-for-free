import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

export type OverviewScope =
    | { kind: 'unauthenticated' }
    | { kind: 'no_db_user' }
    | { kind: 'partner_no_org' }
    | {
          kind: 'admin';
          destination: string | undefined;
          destinationHouseholdId18: string | undefined;
      }
    | { kind: 'partner'; destination: string; partnerHouseholdId18: string };

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
        if (!destination) {
            return { kind: 'admin', destination: undefined, destinationHouseholdId18: undefined };
        }
        const partner = await prisma.partner.findFirst({
            where: { organizationName: { equals: destination, mode: 'insensitive' } },
            select: { householdId18: true },
        });
        return {
            kind: 'admin',
            destination,
            destinationHouseholdId18: partner?.householdId18 ?? undefined,
        };
    }

    const partner = user.partner;
    const orgName = partner?.organizationName?.trim();
    if (!partner || !orgName) return { kind: 'partner_no_org' };

    return {
        kind: 'partner',
        destination: orgName,
        partnerHouseholdId18: partner.householdId18,
    };
}

/** Partner-scoped filter for All* metrics (householdName) and InventoryTransaction.destination when set. */
export function scopeToPartnerFilter(scope: OverviewScope): string | undefined {
    if (scope.kind === 'admin') return scope.destination;
    if (scope.kind === 'partner') return scope.destination;
    return undefined;
}

/** Partner account: Salesforce household id for `JustEatsBoxes.householdId` joins. */
export function scopeToPartnerHouseholdId18(scope: OverviewScope): string | undefined {
    if (scope.kind === 'admin') return scope.destinationHouseholdId18;
    if (scope.kind === 'partner') return scope.partnerHouseholdId18;
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
