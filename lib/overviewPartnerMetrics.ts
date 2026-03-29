import prisma from './prisma';

/** Distinct destination (partner) names from synced package destinations. */
export async function getDistinctPartnerHouseholdNames(): Promise<string[]> {
    const rows = await prisma.allProductPackageDestinations.findMany({
        select: { householdName: true },
        distinct: ['householdName'],
    });
    const names = new Set<string>();
    for (const r of rows) {
        const t = r.householdName?.trim();
        if (t) names.add(t);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export type PartnerDestinationRow = {
    productPackageId18: string;
    date: Date;
};

export async function fetchPartnerDestinationsInRange(
    partnerHouseholdName: string,
    range: { start: Date; end: Date }
): Promise<PartnerDestinationRow[]> {
    const trimmed = partnerHouseholdName.trim();
    if (!trimmed) return [];

    return prisma.allProductPackageDestinations.findMany({
        where: {
            householdName: { equals: trimmed, mode: 'insensitive' },
            date: { gte: range.start, lte: range.end },
        },
        select: { productPackageId18: true, date: true },
    });
}

/** Sum line-item weights per package id (matches distribution join semantics). */
export async function sumWeightsByProductPackageId(
    productPackageIds: string[]
): Promise<Map<string, number>> {
    if (productPackageIds.length === 0) return new Map();

    const items = await prisma.allPackagesByItem.findMany({
        where: { productPackageId18: { in: productPackageIds } },
        select: {
            productPackageId18: true,
            pantryProductWeightLbs: true,
            distributionAmount: true,
        },
    });

    const byPackage = new Map<string, number>();
    for (const item of items) {
        const id = item.productPackageId18;
        if (!id) continue;
        const perUnit = item.pantryProductWeightLbs ?? 0;
        const amount = item.distributionAmount ?? 1;
        byPackage.set(id, (byPackage.get(id) ?? 0) + perUnit * amount);
    }
    return byPackage;
}
