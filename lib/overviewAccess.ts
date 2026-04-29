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
    const { userId, orgId } = await auth();
    if (!userId) return { kind: 'unauthenticated' };

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            partnerMemberships: {
                include: { partner: true },
                orderBy: { createdAt: 'asc' },
            },
        },
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

    const activeMembership = orgId
        ? user.partnerMemberships.find(
              membership => membership.partner.clerkOrganizationId === orgId
          )
        : user.partnerMemberships[0];
    const partner = activeMembership?.partner;
    const orgName = partner?.organizationName?.trim();
    if (!partner || !orgName) return { kind: 'partner_no_org' };

    return {
        kind: 'partner',
        destination: orgName,
        partnerHouseholdId18: partner.householdId18,
    };
}

/** Synthetic Partner.householdId18 when no Salesforce id was provided at signup. */
export const PENDING_PARTNER_HOUSEHOLD_PREFIX = 'pending-' as const;

/** Partner account: Salesforce household id for `JustEatsBoxes.householdId` joins. */
export function scopeToPartnerHouseholdId18(scope: OverviewScope): string | undefined {
    if (scope.kind === 'admin') return scope.destinationHouseholdId18;
    if (scope.kind === 'partner') return scope.partnerHouseholdId18;
    return undefined;
}

/**
 * When true, bulk/rescue metrics come from destination/org name (inventory `destination`,
 * destination tables’ household names), not Salesforce household id joins.
 */
export function partnerUsesDestinationNameOnly(scope: OverviewScope): boolean {
    if (scope.kind === 'partner') {
        return scope.partnerHouseholdId18.startsWith(PENDING_PARTNER_HOUSEHOLD_PREFIX);
    }
    if (scope.kind === 'admin') {
        const householdId = scope.destinationHouseholdId18?.trim();
        if (!scope.destination) return false;
        if (!householdId) return true;
        return householdId.startsWith(PENDING_PARTNER_HOUSEHOLD_PREFIX);
    }
    return false;
}

/**
 * Exact case-insensitive match for filtering by partner or destination display name.
 */
export function scopeOrganizationNameFilter(scope: OverviewScope): string | undefined {
    if (!partnerUsesDestinationNameOnly(scope)) return undefined;
    if (scope.kind === 'partner') return scope.destination.trim();
    if (scope.kind === 'admin' && scope.destination) return scope.destination.trim();
    return undefined;
}

/**
 * True scoped household id for JE / joined bulk; omit when using destination-name-only scope.
 */
export function scopeEffectiveHouseholdId18(scope: OverviewScope): string | undefined {
    if (partnerUsesDestinationNameOnly(scope)) return undefined;
    return scopeToPartnerHouseholdId18(scope);
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
