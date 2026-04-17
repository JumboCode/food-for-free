import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import { getOverviewScope, overviewScopeErrorResponse } from '~/lib/overviewAccess';

/**
 * GET /api/overview/partners
 * Admins: all distinct household names. Partners: only their org (for display; search is hidden in UI).
 */
export async function GET() {
    try {
        const scope = await getOverviewScope(null);
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        if (scope.kind === 'partner') {
            return NextResponse.json({
                partners: [
                    {
                        id: 1,
                        name: scope.destination,
                        householdId18: scope.partnerHouseholdId18,
                        location: '',
                        type: 'Partner',
                    },
                ],
                partnerDashboard: true,
            });
        }

        const partners = await prisma.partner.findMany({
            select: { organizationName: true, householdId18: true },
            orderBy: { organizationName: 'asc' },
        });

        return NextResponse.json({
            partners: partners
                .map((partner, index) => ({
                    id: index + 1,
                    name: partner.organizationName?.trim() ?? '',
                    householdId18: partner.householdId18,
                    location: '',
                    type: 'Partner',
                }))
                .filter(partner => partner.name),
            partnerDashboard: false,
        });
    } catch (err: unknown) {
        console.error('Overview partners error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load partners' },
            { status: 500 }
        );
    }
}
