import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import { normalizeDestinationName } from '~/lib/destinationNameFilter';
import type { OverviewScope } from '~/lib/overviewAccess';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeEffectiveHouseholdId18,
    scopeOrganizationNameFilter,
} from '~/lib/overviewAccess';
import {
    distributionInventoryTypeCondition,
    inventoryTxPoundsSql,
    orphanInventoryCondition,
} from '~/lib/inventoryDistributionSql';

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

function destinationLabel(scope: OverviewScope): string {
    if (scope.kind === 'partner' || scope.kind === 'admin') {
        return scope.destination?.trim() ?? '';
    }
    return '';
}

type DeliveryOut = {
    id: string;
    date: string;
    totalPounds: number;
    destination: string;
    householdId18: string | null;
    program: 'bulk_rescue' | 'just_eats';
};

function mergeDeliveryBuckets(rows: DeliveryOut[]): DeliveryOut[] {
    const map = new Map<string, DeliveryOut>();
    for (const r of rows) {
        const destKey = normalizeDestinationName(r.destination);
        const key = `${r.date}|${destKey}|${r.program}|${r.householdId18 ?? ''}`;
        const prev = map.get(key);
        if (!prev) {
            map.set(key, { ...r });
        } else {
            prev.totalPounds += r.totalPounds;
        }
    }
    return [...map.values()];
}

/**
 * GET /api/overview/deliveries?start=...&end=...&destination=...&householdId18=...
 */
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
        const hh = scopeEffectiveHouseholdId18(scope);
        const orgNameOnly = scopeOrganizationNameFilter(scope);

        type PartnerDeliveryRow = {
            day: string;
            destination: string | null;
            totalPounds: number | null;
        };
        type PartnerJustEatsRow = {
            day: string;
            totalPounds: number | null;
        };
        type OrphanDayRow = {
            day: string;
            totalPounds: number | null;
        };

        const scopedDestinationName =
            scope.kind === 'admin' || scope.kind === 'partner' ? scope.destination : undefined;

        if (orgNameOnly) {
            const [brRows, jeRows, orRows] = await Promise.all([
                prisma.$queryRaw<PartnerDeliveryRow[]>`
                    SELECT
                        TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                        COALESCE(MAX(pt."organizationName"), MAX(d."householdName")) AS "destination",
                        SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds"
                    FROM "AllInventoryTransactions" t
                    INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                    INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
                    LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                    WHERE d."date" >= ${range.start}
                      AND d."date" <= ${range.end}
                      AND LOWER(TRIM(d."householdName")) = LOWER(TRIM(${orgNameOnly}))
                    GROUP BY DATE_TRUNC('day', d."date")
                    HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
                `,
                prisma.$queryRaw<PartnerJustEatsRow[]>`
                    SELECT
                        TO_CHAR(DATE_TRUNC('day', j."pantryVisitDateTime"), 'YYYY-MM-DD') AS "day",
                        (
                            SUM(
                                GREATEST(
                                    COALESCE(j."numberPickedUp", 1),
                                    COALESCE(j."numberDistributed", 1)
                                )
                            ) * 25
                        ) AS "totalPounds"
                    FROM "JustEatsBoxes" j
                    LEFT JOIN "Partner" pt ON pt."householdId18" = j."householdId"
                    WHERE j."pantryVisitDateTime" >= ${range.start}
                      AND j."pantryVisitDateTime" <= ${range.end}
                      AND LOWER(TRIM(j."householdName")) = LOWER(TRIM(${orgNameOnly}))
                    GROUP BY DATE_TRUNC('day', j."pantryVisitDateTime")
                    HAVING (
                        SUM(
                            GREATEST(
                                COALESCE(j."numberPickedUp", 1),
                                COALESCE(j."numberDistributed", 1)
                            )
                        ) * 25
                    ) > 0
                `,
                prisma.$queryRaw<OrphanDayRow[]>`
                    SELECT
                        TO_CHAR(DATE_TRUNC('day', t."date"), 'YYYY-MM-DD') AS "day",
                        SUM(${inventoryTxPoundsSql()}) AS "totalPounds"
                    FROM "AllInventoryTransactions" t
                    WHERE t."date" >= ${range.start}
                      AND t."date" <= ${range.end}
                      AND ${distributionInventoryTypeCondition}
                      AND ${orphanInventoryCondition}
                      AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${orgNameOnly}))
                    GROUP BY DATE_TRUNC('day', t."date")
                    HAVING SUM(${inventoryTxPoundsSql()}) > 0
                `,
            ]);

            const orphanByDay = new Map(
                orRows.map(r => [r.day, Math.round(Number(r.totalPounds ?? 0))])
            );

            const mergedBr: DeliveryOut[] = [];
            for (const r of brRows) {
                const day = r.day;
                const extra = orphanByDay.get(day) ?? 0;
                if (extra) orphanByDay.delete(day);
                mergedBr.push({
                    id: `${day}|name-br|bulk_rescue`,
                    date: `${day}T00:00:00.000Z`,
                    totalPounds: Math.round(Number(r.totalPounds ?? 0)) + extra,
                    destination: r.destination?.trim() || scopedDestinationName || orgNameOnly,
                    householdId18: null,
                    program: 'bulk_rescue',
                });
            }
            for (const [day, lbs] of orphanByDay) {
                if (lbs <= 0) continue;
                mergedBr.push({
                    id: `${day}|name-orphan|bulk_rescue`,
                    date: `${day}T00:00:00.000Z`,
                    totalPounds: lbs,
                    destination: scopedDestinationName || orgNameOnly,
                    householdId18: null,
                    program: 'bulk_rescue',
                });
            }

            const jeOut: DeliveryOut[] = jeRows.map(r => ({
                id: `${r.day}|name|just_eats`,
                date: `${r.day}T00:00:00.000Z`,
                totalPounds: Math.round(Number(r.totalPounds ?? 0)),
                destination: scopedDestinationName || orgNameOnly,
                householdId18: null,
                program: 'just_eats',
            }));

            const merged = mergeDeliveryBuckets([...mergedBr, ...jeOut]).sort((a, b) =>
                a.date < b.date ? 1 : a.date > b.date ? -1 : 0
            );

            return NextResponse.json({
                deliveries: merged.slice(0, 10).map(r => ({
                    id: r.id,
                    date: r.date,
                    totalPounds: r.totalPounds,
                    destination: r.destination,
                    householdId18: r.householdId18,
                    program: r.program,
                })),
            });
        }

        if (hh) {
            const destLabel = destinationLabel(scope);
            const [brRows, jeRows, orRows] = await Promise.all([
                prisma.$queryRaw<PartnerDeliveryRow[]>`
                    SELECT
                        TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                        COALESCE(MAX(pt."organizationName"), MAX(d."householdName")) AS "destination",
                        SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds"
                    FROM "AllInventoryTransactions" t
                    INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                    INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
                    LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                    WHERE d."householdId18" = ${hh}
                      AND d."date" >= ${range.start}
                      AND d."date" <= ${range.end}
                    GROUP BY DATE_TRUNC('day', d."date")
                    HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
                `,
                prisma.$queryRaw<PartnerJustEatsRow[]>`
                    SELECT
                        TO_CHAR(DATE_TRUNC('day', t."pantryVisitDateTime"), 'YYYY-MM-DD') AS "day",
                        (
                            SUM(
                                GREATEST(
                                    COALESCE(t."numberPickedUp", 1),
                                    COALESCE(t."numberDistributed", 1)
                                )
                            ) * 25
                        ) AS "totalPounds"
                    FROM "JustEatsBoxes" t
                    LEFT JOIN "Partner" pt ON pt."householdId18" = t."householdId"
                    WHERE t."householdId" = ${hh}
                      AND t."pantryVisitDateTime" >= ${range.start}
                      AND t."pantryVisitDateTime" <= ${range.end}
                    GROUP BY DATE_TRUNC('day', t."pantryVisitDateTime")
                    HAVING (
                        SUM(
                            GREATEST(
                                COALESCE(t."numberPickedUp", 1),
                                COALESCE(t."numberDistributed", 1)
                            )
                        ) * 25
                    ) > 0
                `,
                destLabel.length > 0
                    ? prisma.$queryRaw<OrphanDayRow[]>`
                        SELECT
                            TO_CHAR(DATE_TRUNC('day', t."date"), 'YYYY-MM-DD') AS "day",
                            SUM(${inventoryTxPoundsSql()}) AS "totalPounds"
                        FROM "AllInventoryTransactions" t
                        WHERE t."date" >= ${range.start}
                          AND t."date" <= ${range.end}
                          AND ${distributionInventoryTypeCondition}
                          AND ${orphanInventoryCondition}
                          AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${destLabel}))
                        GROUP BY DATE_TRUNC('day', t."date")
                        HAVING SUM(${inventoryTxPoundsSql()}) > 0
                    `
                    : Promise.resolve([] as OrphanDayRow[]),
            ]);

            const orphanByDay = new Map(
                orRows.map(r => [r.day, Math.round(Number(r.totalPounds ?? 0))])
            );

            const destinationForRow =
                brRows[0]?.destination?.trim() || scopedDestinationName || destLabel || hh;

            const mergedBr: DeliveryOut[] = [];
            for (const r of brRows) {
                const day = r.day;
                const extra = orphanByDay.get(day) ?? 0;
                if (extra) orphanByDay.delete(day);
                mergedBr.push({
                    id: `${day}|${hh}-br|bulk_rescue`,
                    date: `${day}T00:00:00.000Z`,
                    totalPounds: Math.round(Number(r.totalPounds ?? 0)) + extra,
                    destination: r.destination?.trim() || destinationForRow,
                    householdId18: hh,
                    program: 'bulk_rescue',
                });
            }
            for (const [day, lbs] of orphanByDay) {
                if (lbs <= 0) continue;
                mergedBr.push({
                    id: `${day}|${hh}-orphan|bulk_rescue`,
                    date: `${day}T00:00:00.000Z`,
                    totalPounds: lbs,
                    destination: destinationForRow,
                    householdId18: hh,
                    program: 'bulk_rescue',
                });
            }

            const jeOut: DeliveryOut[] = jeRows.map(r => ({
                id: `${r.day}|${hh}|just_eats`,
                date: `${r.day}T00:00:00.000Z`,
                totalPounds: Math.round(Number(r.totalPounds ?? 0)),
                destination: destinationForRow,
                householdId18: hh,
                program: 'just_eats',
            }));

            const merged = mergeDeliveryBuckets([...mergedBr, ...jeOut]).sort((a, b) =>
                a.date < b.date ? 1 : a.date > b.date ? -1 : 0
            );

            return NextResponse.json({
                deliveries: merged.slice(0, 10).map(r => ({
                    id: r.id,
                    date: r.date,
                    totalPounds: r.totalPounds,
                    destination: r.destination,
                    householdId18: r.householdId18,
                    program: r.program,
                })),
            });
        }

        type DeliveryRow = {
            day: string;
            destination: string | null;
            totalPounds: number | null;
            householdId18: string | null;
            program: string;
        };

        const [joinedRows, orphanGrp, jeGrp] = await Promise.all([
            prisma.$queryRaw<DeliveryRow[]>`
                SELECT
                    TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                    COALESCE(pt."organizationName", d."householdName") AS "destination",
                    d."householdId18" AS "householdId18",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds",
                    'bulk_rescue'::text AS "program"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
                LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                WHERE d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                GROUP BY DATE_TRUNC('day', d."date"), d."householdId18", COALESCE(pt."organizationName", d."householdName"), 'bulk_rescue'::text
                HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
            `,
            prisma.$queryRaw<DeliveryRow[]>`
                SELECT
                    TO_CHAR(DATE_TRUNC('day', t."date"), 'YYYY-MM-DD') AS "day",
                    TRIM(t."destination") AS "destination",
                    NULL::text AS "householdId18",
                    SUM(${inventoryTxPoundsSql()}) AS "totalPounds",
                    'bulk_rescue'::text AS "program"
                FROM "AllInventoryTransactions" t
                WHERE t."date" >= ${range.start}
                  AND t."date" <= ${range.end}
                  AND ${distributionInventoryTypeCondition}
                  AND ${orphanInventoryCondition}
                  AND TRIM(COALESCE(t."destination", '')) <> ''
                GROUP BY DATE_TRUNC('day', t."date"), TRIM(t."destination"), 'bulk_rescue'::text
                HAVING SUM(${inventoryTxPoundsSql()}) > 0
            `,
            prisma.$queryRaw<DeliveryRow[]>`
                SELECT
                    TO_CHAR(DATE_TRUNC('day', t."pantryVisitDateTime"), 'YYYY-MM-DD') AS "day",
                    COALESCE(pt."organizationName", t."householdName") AS "destination",
                    t."householdId" AS "householdId18",
                    (
                        SUM(
                            GREATEST(
                                COALESCE(t."numberPickedUp", 1),
                                COALESCE(t."numberDistributed", 1)
                            )
                        ) * 25
                    ) as "totalPounds",
                    'just_eats'::text AS "program"
                FROM "JustEatsBoxes" t
                LEFT JOIN "Partner" pt ON pt."householdId18" = t."householdId"
                WHERE t."pantryVisitDateTime" >= ${range.start}
                  AND t."pantryVisitDateTime" <= ${range.end}
                  AND TRIM(COALESCE(t."householdName", '')) <> ''
                  AND EXISTS (
                      SELECT 1
                      FROM (
                          SELECT LOWER(TRIM(d2."householdName")) AS org_name
                          FROM "AllProductPackageDestinations" d2
                          WHERE TRIM(COALESCE(d2."householdName", '')) <> ''

                          UNION

                          SELECT LOWER(TRIM(t2."destination")) AS org_name
                          FROM "AllInventoryTransactions" t2
                          WHERE TRIM(COALESCE(t2."destination", '')) <> ''
                            AND LOWER(TRIM(COALESCE(t2."inventoryType", ''))) = 'distribution'
                      ) valid_orgs
                      WHERE valid_orgs.org_name = LOWER(TRIM(t."householdName"))
                  )
                GROUP BY DATE_TRUNC('day', t."pantryVisitDateTime"), t."householdId", COALESCE(pt."organizationName", t."householdName"), 'just_eats'::text
                HAVING (
                    SUM(
                        GREATEST(
                            COALESCE(t."numberPickedUp", 1),
                            COALESCE(t."numberDistributed", 1)
                        )
                    ) * 25
                ) > 0
            `,
        ]);

        const combined: DeliveryOut[] = [...joinedRows, ...orphanGrp, ...jeGrp].map(r => {
            const day = r.day;
            const destination = r.destination ?? null;
            const householdId18 = r.householdId18 ?? null;
            const program = r.program === 'just_eats' ? 'just_eats' : 'bulk_rescue';
            return {
                id: `${day}|${householdId18 ?? normalizeDestinationName(destination ?? '')}|${program}`,
                date: `${day}T00:00:00.000Z`,
                totalPounds: Math.round(Number(r.totalPounds ?? 0)),
                destination: destination ?? '',
                householdId18,
                program,
            };
        });

        const mergedAll = mergeDeliveryBuckets(combined).sort((a, b) =>
            a.date < b.date ? 1 : a.date > b.date ? -1 : 0
        );

        return NextResponse.json({
            deliveries: mergedAll.slice(0, 10).map(r => ({
                id: r.id,
                date: r.date,
                totalPounds: r.totalPounds,
                destination: r.destination || null,
                householdId18: r.householdId18,
                program: r.program,
            })),
        });
    } catch (err: unknown) {
        console.error('Overview deliveries error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load deliveries' },
            { status: 500 }
        );
    }
}
