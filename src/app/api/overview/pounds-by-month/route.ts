import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeToPartnerHouseholdId18,
} from '~/lib/overviewAccess';

const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

function parseDateRange(searchParams: URLSearchParams): { start: Date; end: Date } | null {
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    if (!startParam || !endParam) return null;
    const parseYmdLocal = (value: string): Date | null => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!m) return null;
        const y = Number.parseInt(m[1], 10);
        const mon = Number.parseInt(m[2], 10);
        const d = Number.parseInt(m[3], 10);
        const date = new Date(y, mon - 1, d);
        if (date.getFullYear() !== y || date.getMonth() !== mon - 1 || date.getDate() !== d) {
            return null;
        }
        return date;
    };
    const start = parseYmdLocal(startParam);
    const end = parseYmdLocal(endParam);
    if (!start || !end) return null;
    end.setHours(23, 59, 59, 999);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start, end };
}

function getDefaultRange(): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { start, end };
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const scope = await getOverviewScope(
            searchParams.get('destination'),
            searchParams.get('householdId18')
        );
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        const range = parseDateRange(searchParams) ?? getDefaultRange();
        const partnerHouseholdId18 = scopeToPartnerHouseholdId18(scope);

        const daysDiff = Math.ceil(
            (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
        );
        const yearsDiff =
            range.end.getFullYear() -
            range.start.getFullYear() +
            (range.end.getMonth() - range.start.getMonth()) / 12;
        const aggregateByYear = yearsDiff > 1;
        const aggregateByDay = daysDiff <= 30 && !aggregateByYear;

        type DailyRow = { day: string; pounds: number | null };
        const dailyRows = partnerHouseholdId18
            ? await prisma.$queryRaw<DailyRow[]>`
                SELECT
                    TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "pounds"
                FROM "AllProductPackageDestinations" d
                LEFT JOIN "AllPackagesByItem" p
                    ON p."productPackageId18" = d."productPackageId18"
                WHERE d."householdId18" = ${partnerHouseholdId18}
                  AND d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                GROUP BY DATE_TRUNC('day', d."date")
                ORDER BY DATE_TRUNC('day', d."date") ASC
            `
            : await prisma.$queryRaw<DailyRow[]>`
                SELECT
                    TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "pounds"
                FROM "AllProductPackageDestinations" d
                LEFT JOIN "AllPackagesByItem" p
                    ON p."productPackageId18" = d."productPackageId18"
                WHERE d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                GROUP BY DATE_TRUNC('day', d."date")
                ORDER BY DATE_TRUNC('day', d."date") ASC
            `;

        const buckets: Record<string, number> = {};
        for (const row of dailyRows) {
            const [yearStr, monthStr, dayStr] = row.day.split('-');
            const y = Number.parseInt(yearStr ?? '', 10);
            const m = Number.parseInt(monthStr ?? '', 10);
            const day = Number.parseInt(dayStr ?? '', 10);
            if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day)) continue;
            const weight = Number(row.pounds ?? 0);
            let key: string;
            if (aggregateByYear) {
                key = String(y);
            } else if (aggregateByDay) {
                key = `${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
            } else {
                key = `${MONTH_NAMES[m - 1]} ${y}`;
            }
            buckets[key] = (buckets[key] ?? 0) + weight;
        }

        // Build ordered list of all periods in range so chart shows only range span
        type Period = { month: string; order: number };
        const periodsInRange: Period[] = [];

        if (aggregateByYear) {
            // Only show years that have data (earliest data year onward)
            const yearsWithData = Object.keys(buckets)
                .filter(k => /^\d{4}$/.test(k))
                .map(y => parseInt(y, 10))
                .sort((a, b) => a - b);
            for (const y of yearsWithData) {
                periodsInRange.push({ month: String(y), order: y });
            }
        } else if (aggregateByDay) {
            const cursor = new Date(range.start);
            cursor.setHours(0, 0, 0, 0);
            const end = new Date(range.end);
            end.setHours(0, 0, 0, 0);
            let order = 0;
            while (cursor.getTime() <= end.getTime()) {
                const key = `${String(cursor.getMonth() + 1).padStart(2, '0')}/${String(cursor.getDate()).padStart(2, '0')}`;
                periodsInRange.push({ month: key, order: order++ });
                cursor.setDate(cursor.getDate() + 1);
            }
        } else {
            const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
            const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
            let order = 0;
            while (cursor.getTime() <= end.getTime()) {
                const key = `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
                periodsInRange.push({ month: key, order: order++ });
                cursor.setMonth(cursor.getMonth() + 1);
            }
        }

        const chartData = periodsInRange.map(({ month }) => ({
            month,
            pounds: Math.round(buckets[month] ?? 0),
        }));

        return NextResponse.json(chartData);
    } catch (err: unknown) {
        console.error('Pounds-by-month error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load pounds by month' },
            { status: 500 }
        );
    }
}
