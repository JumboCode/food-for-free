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
        const body = (await req.json()) as {
            fileName?: string;
            sheetName?: string;
            records?: unknown[];
        };
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

        const safeRecords = Array.isArray(records) ? records : [];
        const formattedRecords = safeRecords.map(r => {
            // ------ DATE HANDLING ------
            const rawDate = getField(r as Record<string, unknown>, 'Date', 'date');
            let parsedDate: Date | null = null;

            if (rawDate != null) {
                const rawDateStr = String(rawDate);
                if (!isNaN(Number(rawDateStr))) {
                    // Excel serial
                    parsedDate = excelSerialToJSDate(Number(rawDateStr));
                } else {
                    parsedDate = new Date(rawDateStr);
                }
            }

            const get = (k1: string, k2?: string) =>
                getField(r as Record<string, unknown>, k1, ...(k2 ? [k2] : []));

            return {
                product: (get('Product', 'product') as string) ?? '',
                inventoryType: (get('Inventory Type', 'inventoryType') as string) ?? null,
                amount: Number(get('Amount', 'amount') as unknown) || null,
                units: (get('Units', 'units') as string) ?? null,
                weightLbs: Number(get('Weight (lbs)', 'weightLbs') as unknown) || null,
                source: (get('Source', 'source') as string) ?? null,
                destination: (get('Destination', 'destination') as string) ?? null,
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
