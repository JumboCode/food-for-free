import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

// Convert Excel serial number to JS Date
function excelSerialToJSDate(serial: number) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + serial * 86400000);
}

// Case-insensitive key lookup
function getField<T extends Record<string, unknown>>(obj: T, ...keys: string[]): unknown {
    for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];

        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
        if (foundKey !== undefined) return obj[foundKey];
    }
    return undefined;
}

// --------------------- Row Interfaces ---------------------
interface InventoryRecordRow {
    Product: string;
    'Inventory Type'?: string;
    Amount?: number | string;
    Units?: string;
    'Weight (lbs)'?: number | string;
    Source?: string;
    Destination?: string;
    Date?: string | number;
}

interface InventoryTransactionRow {
    date: string | number;
    location: string;
    pantryProductName: string;
    inventoryType: string;
    amount: number;
    productUnitsForDisplay?: string;
    weightLbs?: number;
    source?: string;
    destination?: string;
    productInventoryRecordId18: string | number;
}

interface PackagesByItemRow {
    productPackageName?: string;
    pantryProductName?: string;
    lotSourceAccountName?: string;
    lotFoodRescueProgram?: string;
    distributionAmount?: number | string;
    pantryProductWeightLbs?: number | string;
    distributionCost?: number | string;
    productInventoryRecordId18: string;
    productPackageId18: string;
}

interface ProductPackageDestinationRow {
    productPackageName: string;
    productPackageId18: string;
    householdName: string;
    householdId18: string;
}

// --------------------- API ---------------------
export async function POST(req: Request) {
    try {
        const body: {
            model: string;
            records: unknown[];
            fileName?: string;
            sheetName?: string;
        } = await req.json();

        const { model, records, fileName, sheetName } = body;

        if (!model || !records || !Array.isArray(records)) {
            return NextResponse.json(
                { success: false, error: 'Missing model or records array' },
                { status: 400 }
            );
        }

        let result;

        switch (model) {
            // ----------------- InventoryRecord -----------------
            case 'InventoryRecord':
                if (!fileName || !sheetName) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'fileName and sheetName required for InventoryRecord',
                        },
                        { status: 400 }
                    );
                }

                const uploadedSheet = await prisma.uploadedSheet.create({
                    data: { fileName, sheetName },
                });

                const formattedRecords = (records as InventoryRecordRow[]).map(r => {
                    const row = r as unknown as Record<string, unknown>;
                    const rawDate = getField(row, 'Date', 'date');
                    let parsedDate: Date | null = null;

                    if (rawDate != null) {
                        parsedDate = !isNaN(Number(rawDate))
                            ? excelSerialToJSDate(Number(rawDate))
                            : new Date(rawDate as string);
                    }

                    return {
                        product: (getField(row, 'Product', 'product') as string) ?? '',
                        inventoryType:
                            (getField(row, 'Inventory Type', 'inventoryType') as string) ?? null,
                        amount: Number(getField(row, 'Amount', 'amount')) || null,
                        units: (getField(row, 'Units', 'units') as string) ?? null,
                        weightLbs: Number(getField(row, 'Weight (lbs)', 'weightLbs')) || null,
                        source: (getField(row, 'Source', 'source') as string) ?? null,
                        destination: (getField(row, 'Destination', 'destination') as string) ?? null,
                        date: parsedDate,
                        uploadedSheetId: uploadedSheet.id,
                    };
                });

                if (formattedRecords.length > 0) {
                    result = await prisma.inventoryRecord.createMany({ data: formattedRecords });
                } else {
                    result = { count: 0 };
                }

                return NextResponse.json({
                    success: true,
                    uploadedSheetId: uploadedSheet.id,
                    count: formattedRecords.length,
                });

            // ----------------- InventoryTransaction -----------------
            case 'InventoryTransaction':
                const validTransactions = (records as InventoryTransactionRow[])
                    .map(r => {
                        const rawDate = r.date;
                        let parsedDate: Date | null = null;

                        if (rawDate != null) {
                            if (typeof rawDate === 'number') {
                                // Excel serial number
                                parsedDate = excelSerialToJSDate(rawDate);
                            } else if (typeof rawDate === 'string') {
                                // ISO string or other date string
                                parsedDate = new Date(rawDate);
                                // Validate the date
                                if (isNaN(parsedDate.getTime())) {
                                    parsedDate = null;
                                }
                            }
                        }

                        return {
                            date: parsedDate,
                            location: r.location || null,
                            pantryProductName: r.pantryProductName || null,
                            inventoryType: r.inventoryType || null,
                            amount: r.amount != null ? Number(r.amount) : null,
                            productUnitsForDisplay: r.productUnitsForDisplay || null,
                            weightLbs: r.weightLbs != null ? Number(r.weightLbs) : null,
                            source: r.source || null,
                            destination: r.destination || null,
                            productInventoryRecordId18: r.productInventoryRecordId18 != null 
                                ? String(r.productInventoryRecordId18).trim() 
                                : null,
                        };
                    })
                    .filter(
                        r =>
                            r.productInventoryRecordId18 &&
                            r.date &&
                            !isNaN(r.date.getTime()) &&
                            r.location &&
                            r.pantryProductName &&
                            r.inventoryType &&
                            r.amount != null &&
                            !isNaN(r.amount)
                    );

                if (validTransactions.length === 0) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'No valid InventoryTransaction records found. Check required fields: date, location, pantryProductName, inventoryType, amount, productInventoryRecordId18',
                        },
                        { status: 400 }
                    );
                }

                result = await prisma.inventoryTransaction.createMany({
                    data: validTransactions,
                    skipDuplicates: true,
                });

                return NextResponse.json({
                    success: true,
                    count: result.count,
                    message: `Successfully uploaded ${result.count} InventoryTransaction records`,
                });

            // ----------------- PackagesByItem -----------------
            case 'PackagesByItem':
                const validPackages = (records as PackagesByItemRow[])
                    .map(r => ({
                        productPackageName: r.productPackageName || null,
                        pantryProductName: r.pantryProductName || null,
                        lotSourceAccountName: r.lotSourceAccountName || null,
                        lotFoodRescueProgram: r.lotFoodRescueProgram || null,
                        distributionAmount: r.distributionAmount
                            ? Number(r.distributionAmount)
                            : null,
                        pantryProductWeightLbs: r.pantryProductWeightLbs
                            ? Number(r.pantryProductWeightLbs)
                            : null,
                        distributionCost: r.distributionCost ? Number(r.distributionCost) : null,
                        productInventoryRecordId18: r.productInventoryRecordId18,
                        productPackageId18: r.productPackageId18,
                    }))
                    .filter(r => r.productInventoryRecordId18 && r.productPackageId18);

                if (validPackages.length === 0) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'No valid PackagesByItem records found. Check required fields.',
                        },
                        { status: 400 }
                    );
                }

                result = await prisma.packagesByItem.createMany({
                    data: validPackages,
                    skipDuplicates: false,
                });

                return NextResponse.json({
                    success: true,
                    count: result.count,
                    message: `Successfully uploaded ${result.count} PackagesByItem records`,
                });

            // ----------------- ProductPackageDestination -----------------
            case 'ProductPackageDestination':
                const validDestinations = (records as ProductPackageDestinationRow[])
                    .map(r => ({
                        productPackageName: r.productPackageName,
                        productPackageId18: r.productPackageId18,
                        householdName: r.householdName,
                        householdId18: r.householdId18,
                    }))
                    .filter(
                        r =>
                            r.productPackageId18 &&
                            r.productPackageName &&
                            r.householdName &&
                            r.householdId18
                    );

                if (validDestinations.length === 0) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'No valid ProductPackageDestination records found. Check required fields.',
                        },
                        { status: 400 }
                    );
                }

                result = await prisma.productPackageDestination.createMany({
                    data: validDestinations,
                    skipDuplicates: true,
                });

                return NextResponse.json({
                    success: true,
                    count: result.count,
                    message: `Successfully uploaded ${result.count} ProductPackageDestination records`,
                });

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown model: ${model}` },
                    { status: 400 }
                );
        }
    } catch (err: any) {
        console.error('Upload error:', err);
        console.error('Error details:', {
            code: err.code,
            message: err.message,
            meta: err.meta,
        });

        if (err.code === "P2002") {
          return NextResponse.json(
            { success: false, error: "Duplicate record detected. Some records may already exist." },
            { status: 409 }
          );
        }

        if (err.code === "P2003") {
          return NextResponse.json(
            { success: false, error: "Foreign key constraint failed. Ensure related records exist first." },
            { status: 400 }
          );
        }

        return NextResponse.json(
            { 
                success: false, 
                error: err.message || 'Upload failed',
                details: process.env.NODE_ENV === 'development' ? err.stack : undefined
            },
            { status: 500 }
        );
    }
}
