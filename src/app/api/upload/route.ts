import { NextResponse } from "next/server";
import prisma from "~/lib/prisma";

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
    const foundKey = Object.keys(obj).find(
      (k) => k.toLowerCase() === lowerKey
    );
    if (foundKey !== undefined) return obj[foundKey];
  }
  return undefined;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { model, records, fileName, sheetName } = body;

    // Validate request
    if (!model || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: "Missing model or records array" },
        { status: 400 }
      );
    }

    let result;

    switch (model) {
      // ========== INVENTORY RECORD (original logic) ==========
      case "InventoryRecord":
        if (!fileName || !sheetName) {
          return NextResponse.json(
            { success: false, error: "fileName and sheetName required for InventoryRecord" },
            { status: 400 }
          );
        }

        const uploadedSheet = await prisma.uploadedSheet.create({
          data: { fileName, sheetName },
        });

        const formattedRecords = records.map((r: any) => {
          // ------ DATE HANDLING ------
          let rawDate = getField(r, "Date", "date");
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
            product: getField(r, "Product", "product") ?? "",
            inventoryType: getField(r, "Inventory Type", "inventoryType") ?? null,
            amount: Number(getField(r, "Amount", "amount")) || null,
            units: getField(r, "Units", "units") ?? null,
            weightLbs: Number(getField(r, "Weight (lbs)", "weightLbs")) || null,
            source: getField(r, "Source", "source") ?? null,
            destination: getField(r, "Destination", "destination") ?? null,
            date: parsedDate,
            uploadedSheetId: uploadedSheet.id,
          };
        });

        if (formattedRecords.length > 0) {
          result = await prisma.inventoryRecord.createMany({
            data: formattedRecords,
          });
        } else {
          result = { count: 0 };
        }

        return NextResponse.json({
          success: true,
          uploadedSheetId: uploadedSheet.id,
          count: formattedRecords.length,
        });

      // ========== INVENTORY TRANSACTION ==========
      case "InventoryTransaction":
        // Validate and filter records
        const validTransactions = records
          .map((r: any) => {
            // Parse date
            let rawDate = r.date;
            let parsedDate: Date | null = null;

            if (rawDate != null) {
              if (!isNaN(Number(rawDate))) {
                parsedDate = excelSerialToJSDate(Number(rawDate));
              } else {
                parsedDate = new Date(rawDate);
              }
            }

            return {
              date: parsedDate,
              location: r.location,
              pantryProductName: r.pantryProductName,
              inventoryType: r.inventoryType,
              amount: r.amount,
              productUnitsForDisplay: r.productUnitsForDisplay || null,
              weightLbs: r.weightLbs || null,
              source: r.source || null,
              destination: r.destination || null,
              productInventoryRecordId18: r.productInventoryRecordId18,
            };
          })
          .filter((r) => 
            r.productInventoryRecordId18 && 
            r.date && 
            r.location && 
            r.pantryProductName && 
            r.inventoryType &&
            r.amount !== null
          );

        if (validTransactions.length === 0) {
          return NextResponse.json(
            { success: false, error: "No valid InventoryTransaction records found. Check required fields." },
            { status: 400 }
          );
        }

        result = await prisma.inventoryTransaction.createMany({
          data: validTransactions,
          skipDuplicates: true, // Skip if productInventoryRecordId18 already exists
        });

        return NextResponse.json({
          success: true,
          count: result.count,
          message: `Successfully uploaded ${result.count} InventoryTransaction records`,
        });

      // ========== PACKAGES BY ITEM ==========
      case "PackagesByItem":
        const validPackages = records
          .map((r: any) => ({
            productPackageName: r.productPackageName || null,
            pantryProductName: r.pantryProductName || null,
            lotSourceAccountName: r.lotSourceAccountName || null,
            lotFoodRescueProgram: r.lotFoodRescueProgram || null,
            distributionAmount: r.distributionAmount || null,
            pantryProductWeightLbs: r.pantryProductWeightLbs || null,
            distributionCost: r.distributionCost || null,
            productInventoryRecordId18: r.productInventoryRecordId18,
            productPackageId18: r.productPackageId18,
          }))
          .filter((r) => 
            r.productInventoryRecordId18 && 
            r.productPackageId18
          );

        if (validPackages.length === 0) {
          return NextResponse.json(
            { success: false, error: "No valid PackagesByItem records found. Check required fields." },
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

      // ========== PRODUCT PACKAGE DESTINATION ==========
      case "ProductPackageDestination":
        const validDestinations = records
          .map((r: any) => ({
            productPackageName: r.productPackageName,
            productPackageId18: r.productPackageId18,
            householdName: r.householdName,
            householdId18: r.householdId18,
          }))
          .filter((r) => 
            r.productPackageId18 && 
            r.productPackageName && 
            r.householdName && 
            r.householdId18
          );

        if (validDestinations.length === 0) {
          return NextResponse.json(
            { success: false, error: "No valid ProductPackageDestination records found. Check required fields." },
            { status: 400 }
          );
        }

        result = await prisma.productPackageDestination.createMany({
          data: validDestinations,
          skipDuplicates: true, // Skip if productPackageId18 already exists
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
    console.error("Upload error:", err);
    
    // Handle Prisma-specific errors
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
      { success: false, error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}