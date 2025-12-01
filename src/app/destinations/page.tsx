'use client';

import React, { useState } from 'react';
import FileUploadButton, {
    InventoryRecord,
    getUniqueDestinations,
} from '@/components/FileUploadButton';
import UniqueDestinationsDisplay from '@/components/UniqueDestinationsDisplay';

export default function DestinationsPage() {
    const [records, setRecords] = useState<InventoryRecord[]>([]);
    const [destinations, setDestinations] = useState<string[]>([]);

    const handleDataParsed = (data: InventoryRecord[]) => {
        setRecords(data);

        // Extract & normalize destinations (No Destination grouping)
        const unique = getUniqueDestinations(data);
        setDestinations(unique);
    };

    return (
        <main className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Destination Explorer</h1>
                <p className="text-sm text-muted-foreground">
                    Upload a <code>Rescue Numbers.xls</code> (or .xlsx / .csv) file to see all
                    unique destinations. Rows with no destination are grouped under
                    <span className="font-medium"> “No Destination”</span>.
                </p>
            </header>

            <FileUploadButton onDataParsed={handleDataParsed} />

            <UniqueDestinationsDisplay destinations={destinations} />

            {/* Optional debug info while you’re building */}
            {process.env.NODE_ENV === 'development' && records.length > 0 && (
                <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-950/90 p-3 text-xs text-slate-100">
                    {JSON.stringify(records.slice(0, 5), null, 2)}
                </pre>
            )}
        </main>
    );
}
