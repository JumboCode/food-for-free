import { NextResponse } from 'next/server';
import { getOverviewScope, overviewScopeErrorResponse } from '~/lib/overviewAccess';
import { getDistinctPartnerHouseholdNames } from '~/lib/overviewPartnerMetrics';

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
                        location: '',
                        type: 'Partner',
                    },
                ],
                partnerDashboard: true,
            });
        }

        const unique = await getDistinctPartnerHouseholdNames();

        return NextResponse.json({
            partners: unique.map((name, index) => ({
                id: index + 1,
                name,
                location: '',
                type: 'Partner',
            })),
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
