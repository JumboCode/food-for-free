import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

type CsvRow = Record<string, string | undefined>;
type DistributionStatus = 'Completed' | 'Canceled' | 'Scheduled' | 'Delivered' | 'NoShow';

function parseBoolean(value: string | undefined): boolean | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return null;
}

function parseDate(value: string | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function parseIntOrNull(value: string | undefined): number | null {
    if (!value) return null;
    const normalized = value.trim().replace(/,/g, '');
    const parsed = Number.parseInt(normalized, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

function parseFloatOrNull(value: string | undefined): number | null {
    if (!value) return null;
    const normalized = value.trim().replace(/,/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? null : parsed;
}

function parseDistributionStatus(value: string | undefined): DistributionStatus | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'completed') return 'Completed';
    if (normalized === 'canceled' || normalized === 'cancelled') return 'Canceled';
    if (normalized === 'scheduled') return 'Scheduled';
    if (normalized === 'delivered') return 'Delivered';
    if (normalized === 'no show') return 'NoShow';
    return null;
}

function parseCsv(filePath: string): CsvRow[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as CsvRow[];
}

function chunkArray<T>(items: T[], chunkSize: number): T[][];
function chunkArray<T>(items: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) return [items];
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}

async function loadInventoryTransactions(filePath: string) {
    await prisma.allInventoryTransactions.deleteMany({
        where: { inventoryType: 'Intake' },
    });

    const rows = parseCsv(filePath);
    const payload = rows
        .map(r => {
            const date = parseDate(r['Date']);
            const amount = parseIntOrNull(r['Amount']);
            const id = r['Product Inventory Record ID 18']?.trim();
            const pantryProductName = r['Pantry Product: Product']?.trim();
            const inventoryType = r['Inventory Type']?.trim();
            const location = r['Location']?.trim();

            if (inventoryType?.toLowerCase() === 'intake') return null;

            if (
                !date ||
                amount === null ||
                !id ||
                !pantryProductName ||
                !inventoryType ||
                !location
            ) {
                return null;
            }

            return {
                pantryProductName,
                inventoryType,
                amount,
                productUnitsForDisplay: r['Product Units for Display'] || null,
                weightLbs: parseFloatOrNull(r['Weight (in pounds)']),
                source: r['Source'] || null,
                destination: r['Destination'] || null,
                productInventoryRecordId18: id,
                createdAt: parseDate(r['Product Inventory Record: Created Date']) ?? undefined,
                updatedAt:
                    parseDate(r['Product Inventory Record: Last Modified Date']) ?? undefined,
                minimallyProcessedFood: parseBoolean(r['Minimally Processed Food']),
                productType: r['Product Type'] || null,
                date,
                location,
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const chunks = chunkArray(payload, 1000);
    for (const chunk of chunks) {
        await prisma.allInventoryTransactions.createMany({
            data: chunk,
            skipDuplicates: true,
        });
    }
}

async function loadPackagesByItem(filePath: string) {
    const rows = parseCsv(filePath);
    const payload = rows
        .map(r => {
            const id = r['Distribution Record: Product Inventory Record ID 18']?.trim();
            if (!id) return null;

            return {
                lotSourceAccountName: r['Lot: Source: Account Name'] || null,
                lotFoodRescueProgram: r['Lot: Food Rescue Program'] || null,
                distributionAmount: parseIntOrNull(r['Distribution Record: Amount']),
                pantryProductWeightLbs: parseFloatOrNull(r['Pantry Product: Weight (in pounds)']),
                distributionCost: parseFloatOrNull(r['Distribution Record: Cost']),
                productInventoryRecordId18: id,
                productPackageId18: r['Product Package ID 18'] || null,
                createdAt: parseDate(r['Distribution Record: Created Date']) ?? undefined,
                updatedAt: parseDate(r['Distribution Record: Last Modified Date']) ?? undefined,
                productPackageName: r['Product Package: Product Package Name'] || null,
                pantryProductName: r['Pantry Product: Product'] || null,
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const chunks = chunkArray(payload, 1000);
    for (const chunk of chunks) {
        await prisma.allPackagesByItem.createMany({
            data: chunk,
            skipDuplicates: true,
        });
    }
}

async function loadProductPackageDestinations(filePath: string) {
    const rows = parseCsv(filePath);
    const payload = rows
        .map(r => {
            const productPackageId18 = r['Product Package ID 18']?.trim();
            const householdName = r['Pantry Visit Where Distributed: Household Name']?.trim();
            const householdId18 = r['Pantry Visit Where Distributed: Household ID 18']?.trim();
            const pantryVisitId18 = r['Pantry Visit Where Distributed: Visit ID 18']?.trim();
            const date = parseDate(r['Pantry Visit Where Distributed: Pantry Visit Date/Time']);
            const productPackageName = r['Product Package: Product Package Name']?.trim();

            if (
                !productPackageId18 ||
                !householdName ||
                !householdId18 ||
                !pantryVisitId18 ||
                !date ||
                !productPackageName
            ) {
                return null;
            }

            return {
                productPackageId18,
                householdName,
                householdId18,
                pantryVisitId18,
                date,
                distributionStatus: parseDistributionStatus(
                    r['Distribution Status'] ??
                        r['Pantry Visit Where Distributed: Distribution Status'] ??
                        r['Status']
                ),
                createdAt:
                    parseDate(r['Pantry Visit Where Distributed: Created Date']) ?? undefined,
                updatedAt:
                    parseDate(r['Pantry Visit Where Distributed: Last Modified Date']) ?? undefined,
                productPackageName,
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const chunks = chunkArray(payload, 1000);
    for (const chunk of chunks) {
        await prisma.allProductPackageDestinations.createMany({
            data: chunk,
            skipDuplicates: true,
        });
    }
}

async function main() {
    const dataDir = path.resolve(process.cwd(), 'data');

    await loadInventoryTransactions(
        path.join(dataDir, 'All Inventory Transactions 2025-07-01 to 2026-03-30.csv')
    );
    await loadPackagesByItem(path.join(dataDir, 'Packages by Item 2025-07-01 to 2026-03-30.csv'));
    await loadProductPackageDestinations(
        path.join(dataDir, 'Product Package Destination 2025-07-01 to 2026-03-30.csv')
    );
}

main()
    .catch(() => {
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
