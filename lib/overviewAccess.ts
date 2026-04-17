import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin as resolveIsAdmin } from '@/lib/admin';
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
    requestedDestination: string | null | undefined,
    requestedHouseholdId18?: string | null | undefined
): Promise<OverviewScope> {
    const { userId } = await auth();
    if (!userId) return { kind: 'unauthenticated' };

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { partner: true },
    });
    if (!user) return { kind: 'no_db_user' };

    const admin = await resolveIsAdmin(userId);
    if (admin) {
        const d = requestedDestination?.trim();
        const requestedId = requestedHouseholdId18?.trim();
        if (requestedId) {
            const partner = await prisma.partner.findFirst({
                where: { householdId18: requestedId },
                select: { organizationName: true, householdId18: true },
            });
            return {
                kind: 'admin',
                destination: partner?.organizationName?.trim() || d || undefined,
                destinationHouseholdId18: partner?.householdId18 ?? requestedId,
            };
        }

        // ID-only filtering: without a household id, admin scope is "all organizations".
        const destination = d && d !== 'All Organizations' ? d : undefined;
        return {
            kind: 'admin',
            destination,
            destinationHouseholdId18: undefined,
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
