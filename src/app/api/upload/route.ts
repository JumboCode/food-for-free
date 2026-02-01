import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

// Convert Excel serial number to JS Date
function excelSerialToJSDate(serial: number) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + serial * 86400000);
}

// Case-insensitive key lookup
function getField(obj: any, ...keys: string[]): any {
    for (const key of keys) {
        // exact match
        if (obj[key] !== undefined) return obj[key];

        // case-insensitive match
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
        if (foundKey !== undefined) return obj[foundKey];
    }
    return undefined;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { fileName, sheetName, records } = body;

        if (!fileName || !sheetName || !records) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const uploadedSheet = await prisma.uploadedSheet.create({
            data: { fileName, sheetName },
        });

        const formattedRecords = records.map((r: any) => {
            // ------ DATE HANDLING ------
            let rawDate = getField(r, 'Date', 'date');
            let parsedDate: Date | null = null;

            if (rawDate != null) {
                if (!isNaN(Number(rawDate))) {
                    // Excel serial
                    parsedDate = excelSerialToJSDate(Number(rawDate));
                } else {
                    parsedDate = new Date(rawDate);
                }
            }

            return {
                product: getField(r, 'Product', 'product') ?? '',
                inventoryType: getField(r, 'Inventory Type', 'inventoryType') ?? null,
                amount: Number(getField(r, 'Amount', 'amount')) || null,
                units: getField(r, 'Units', 'units') ?? null,
                weightLbs: Number(getField(r, 'Weight (lbs)', 'weightLbs')) || null,
                source: getField(r, 'Source', 'source') ?? null,
                destination: getField(r, 'Destination', 'destination') ?? null,
                date: parsedDate,
                uploadedSheetId: uploadedSheet.id,
            };
        });

        if (formattedRecords.length > 0) {
            await prisma.inventoryRecord.createMany({
                data: formattedRecords,
            });
        }

        return NextResponse.json({
            success: true,
            uploadedSheetId: uploadedSheet.id,
            count: formattedRecords.length,
        });
    } catch (err: any) {
        console.error('Upload error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
