import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import * as XLSX from 'xlsx';

// Convert Excel serial number to JS Date
function excelSerialToJSDate(serial: number): Date {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + serial * 86400000);
}

// Parse date from various formats
function parseDate(value: any): Date | null {
    if (!value) return null;
    
    // If it's already a Date
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value;
    }
    
    // If it's a number (Excel serial date)
    if (typeof value === 'number' && !isNaN(value)) {
        return excelSerialToJSDate(value);
    }
    
    // If it's a string
    if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    
    return null;
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const model = formData.get('model') as string;

        if (!file || !model) {
            return NextResponse.json(
                { success: false, error: 'Missing file or model' },
                { status: 400 }
            );
        }

        // Read Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        let result;

        switch (model) {
            // ----------------- InventoryTransaction -----------------
            case 'InventoryTransaction': {
                // Read from row 12 (header at row 11, 0-indexed)
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                    range: 11,
                    defval: null,
                    raw: false // This helps with date parsing
                });

                // Forward-fill the date and location (they only appear in first row of each group)
                let currentDate: Date | null = null;
                let currentLocation: string | null = null;

                const validTransactions = jsonData
                    .map((row: any) => {
                        // Update current date/location if present in this row
                        const rowDate = row['Date  ↓'] || row['Date'];
                        const rowLocation = row['Location  ↑'] || row['Location'];
                        
                        if (rowDate) {
                            currentDate = parseDate(rowDate);
                        }
                        if (rowLocation) {
                            currentLocation = rowLocation;
                        }

                        const productName = row['Pantry Product: Product'] || row['pantryProductName'];
                        const inventoryType = row['Inventory Type'] || row['inventoryType'];
                        const amount = row['Amount'] || row['amount'];
                        const recordId = row['Product Inventory Record ID 18'] || row['productInventoryRecordId18'];

                        return {
                            date: currentDate,
                            location: currentLocation,
                            pantryProductName: productName || null,
                            inventoryType: inventoryType || null,
                            amount: amount != null ? Number(amount) : null,
                            productUnitsForDisplay: row['Product Units for Display'] || row['productUnitsForDisplay'] || null,
                            weightLbs: row['Weight (in pounds)'] || row['weightLbs'] ? Number(row['Weight (in pounds)'] || row['weightLbs']) : null,
                            source: row['Source'] || row['source'] || null,
                            destination: row['Destination'] || row['destination'] || null,
                            productInventoryRecordId18: recordId ? String(recordId).trim() : null,
                        };
                    })
                    .filter((r: any) =>
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
                            error: 'No valid InventoryTransaction records found after parsing. Check file format.',
                        },
                        { status: 400 }
                    );
                }

                result = await prisma.inventoryTransaction.createMany({
                    data: validTransactions as Array<{
                        date: Date;
                        location: string;
                        pantryProductName: string;
                        inventoryType: string;
                        amount: number;
                        productUnitsForDisplay: string | null;
                        weightLbs: number | null;
                        source: string | null;
                        destination: string | null;
                        productInventoryRecordId18: string;
                    }>,
                    skipDuplicates: true,
                });

                return NextResponse.json({
                    success: true,
                    count: result.count,
                    message: `Successfully uploaded ${result.count} InventoryTransaction records`,
                });
            }

            // ----------------- PackagesByItem -----------------
            case 'PackagesByItem': {
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                    range: 9,
                    defval: null 
                });

                // First map all rows so we can give detailed diagnostics
                const mappedPackages = jsonData.map((row: any, index: number) => {
                    const productInventoryRecordId18 =
                        row['Distribution Record: Product Inventory Record ID 18'] ||
                        row['productInventoryRecordId18']
                            ? String(
                                  row['Distribution Record: Product Inventory Record ID 18'] ||
                                      row['productInventoryRecordId18']
                              ).trim()
                            : null;

                    const productPackageId18 =
                        row['Product Package ID 18'] || row['productPackageId18']
                            ? String(
                                  row['Product Package ID 18'] || row['productPackageId18']
                              ).trim()
                            : null;

                    return {
                        // Approximate Excel row number (header is at row 10, data starts at 11)
                        rowNumber: index + 11,
                        productPackageName:
                            row['Product Package: Product Package Name  ↑'] ||
                            row['productPackageName'] ||
                            null,
                        pantryProductName:
                            row['Pantry Product: Product  ↑'] || row['pantryProductName'] || null,
                        lotSourceAccountName:
                            row['Lot: Source: Account Name'] ||
                            row['lotSourceAccountName'] ||
                            null,
                        lotFoodRescueProgram:
                            row['Lot: Food Rescue Program'] ||
                            row['lotFoodRescueProgram'] ||
                            null,
                        distributionAmount:
                            row['Distribution Record: Amount'] || row['distributionAmount']
                                ? Number(
                                      row['Distribution Record: Amount'] ||
                                          row['distributionAmount']
                                  )
                                : null,
                        pantryProductWeightLbs:
                            row['Pantry Product: Weight (in pounds)'] ||
                            row['pantryProductWeightLbs']
                                ? Number(
                                      row['Pantry Product: Weight (in pounds)'] ||
                                          row['pantryProductWeightLbs']
                                  )
                                : null,
                        distributionCost:
                            row['Distribution Record: Cost'] || row['distributionCost']
                                ? Number(
                                      row['Distribution Record: Cost'] || row['distributionCost']
                                  )
                                : null,
                        productInventoryRecordId18,
                        productPackageId18,
                    };
                });

                // Keep only rows that have BOTH IDs present.
                // Rows missing either ID are ignored.
                const validPackages = mappedPackages.filter(
                    (r: any) => r.productInventoryRecordId18 && r.productPackageId18
                );

                if (validPackages.length === 0) {
                    const missingInventoryRows = mappedPackages
                        .filter((r: any) => !r.productInventoryRecordId18)
                        .slice(0, 10)
                        .map((r: any) => r.rowNumber);

                    const missingPackageRows = mappedPackages
                        .filter((r: any) => !r.productPackageId18)
                        .slice(0, 10)
                        .map((r: any) => r.rowNumber);

                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                'No valid PackagesByItem records found. ' +
                                'Each saved row must have BOTH "Distribution Record: Product Inventory Record ID 18" and "Product Package ID 18". ' +
                                (missingInventoryRows.length
                                    ? `Missing Inventory Record ID on approx rows: ${missingInventoryRows.join(
                                          ', '
                                      )}. `
                                    : '') +
                                (missingPackageRows.length
                                    ? `Missing Product Package ID on approx rows: ${missingPackageRows.join(
                                          ', '
                                      )}.`
                                    : ''),
                            details: {
                                missingInventoryRows,
                                missingPackageRows,
                            },
                        },
                        { status: 400 }
                    );
                }

                const packagesToInsert = validPackages.map((p: any) => ({
                    productPackageName: p.productPackageName,
                    pantryProductName: p.pantryProductName,
                    lotSourceAccountName: p.lotSourceAccountName,
                    lotFoodRescueProgram: p.lotFoodRescueProgram,
                    distributionAmount: p.distributionAmount,
                    pantryProductWeightLbs: p.pantryProductWeightLbs,
                    distributionCost: p.distributionCost,
                    productInventoryRecordId18: p.productInventoryRecordId18,
                    productPackageId18: p.productPackageId18,
                }));

                result = await prisma.packagesByItem.createMany({
                    data: packagesToInsert as Array<{
                        productPackageName: string | null;
                        pantryProductName: string | null;
                        lotSourceAccountName: string | null;
                        lotFoodRescueProgram: string | null;
                        distributionAmount: number | null;
                        pantryProductWeightLbs: number | null;
                        distributionCost: number | null;
                        productInventoryRecordId18: string;
                        productPackageId18: string;
                    }>,
                    skipDuplicates: true,
                });

                return NextResponse.json({
                    success: true,
                    count: result.count,
                    message:
                        `Successfully uploaded ${result.count} PackagesByItem records. Rows missing either ID were ignored.`,
                });
            }

            // ----------------- ProductPackageDestination -----------------
            case 'ProductPackageDestination': {
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                    range: 9,
                    defval: null 
                });

                const validDestinations = jsonData
                    .map((row: any) => ({
                        productPackageName:
                            row['Product Package: Product Package Name  ↑'] ||
                            row['productPackageName'],
                        productPackageId18:
                            row['Product Package ID  18'] ||
                            row['Product Package ID 18'] ||
                            row['productPackageId18']
                                ? String(
                                      row['Product Package ID  18'] ||
                                          row['Product Package ID 18'] ||
                                          row['productPackageId18']
                                  ).trim()
                                : null,
                        householdName:
                            row['Pantry Visit Where Distributed: Household Name'] ||
                            row['householdName'] ||
                            null,
                        householdId18:
                            row['Pantry Visit Where Distributed: Household ID 18'] ||
                            row['householdId18'] ||
                            null,
                    }))
                    .filter((r: any) => {
                        if (!r.productPackageId18 || !r.productPackageName) {
                            return false;
                        }

                        const name = String(r.productPackageName).trim();
                        const isSummaryRow =
                            name.toLowerCase().startsWith('subtotal') ||
                            name.toLowerCase().startsWith('total');

                        // Skip summary/count rows like "Subtotal" or "Total"
                        if (isSummaryRow) {
                            return false;
                        }

                        // Only keep rows that have full household info, since the
                        // Prisma model requires these fields to be non-null.
                        return Boolean(r.householdName && r.householdId18);
                    });

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
                    data: validDestinations as Array<{
                        productPackageName: string;
                        productPackageId18: string;
                        householdName: string;
                        householdId18: string;
                    }>,
                    skipDuplicates: true,
                });

                return NextResponse.json({
                    success: true,
                    count: result.count,
                    message: `Successfully uploaded ${result.count} ProductPackageDestination records`,
                });
            }

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