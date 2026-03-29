import { NextResponse } from 'next/server';
import { getDistinctPartnerHouseholdNames } from '~/lib/overviewPartnerMetrics';

/**
 * GET /api/overview/partners
 * Returns distinct partner (destination) names from AllProductPackageDestinations.householdName.
 */
export async function GET() {
    try {
        const unique = await getDistinctPartnerHouseholdNames();

        return NextResponse.json({
            partners: unique.map((name, index) => ({
                id: index + 1,
                name,
                location: '',
                type: 'Partner',
            })),
        });
    } catch (err: unknown) {
        console.error('Overview partners error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load partners' },
            { status: 500 }
        );
    }
}
