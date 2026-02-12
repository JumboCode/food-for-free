'use client';

import React, { useEffect, useState } from 'react';
import { PoundsByMonthChart, PoundsData } from '@/components/ui/PoundsByMonthChart';
import FileUploadButton from '@/components/FileUploadButton';

export default function PoundsPage() {
    const [data, setData] = useState<PoundsData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/pounds-by-month');
                if (!res.ok) throw new Error('Failed to fetch pounds data');
                const json = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="p-6">Loading…</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;

    return (
        <div className="p-6">
            <FileUploadButton
                endpoint="/api/upload-pounds-data"
                onSuccess={(newData: PoundsData[]) => setData(newData)}
            >
                Upload Pounds Data
            </FileUploadButton>
            <PoundsByMonthChart data={data} title="Puffin: Pounds Donated By Month" />
        </div>
    );
}
