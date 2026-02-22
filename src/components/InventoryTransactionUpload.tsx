'use client';

import { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function InventoryTransactionUpload() {
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState<number>(0);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setSuccess(false);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('model', 'InventoryTransaction');

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setSuccess(true);
            setCount(data.count || 0);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            // Reset the input so the same file can be uploaded again
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-3">
            <label className="block">
                <div
                    className={`
                    flex items-center gap-3 px-6 py-4 rounded-lg border-2 cursor-pointer transition-all
                    ${
                        uploading
                            ? 'border-blue-300 bg-blue-50'
                            : success
                              ? 'border-green-300 bg-green-50'
                              : error
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200 hover:border-[#E7A54E] hover:bg-orange-50'
                    }
                `}
                >
                    {uploading ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : error ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                        <Upload className="w-5 h-5 text-gray-500" />
                    )}

                    <div className="flex-1">
                        <div className="font-semibold text-gray-900">Inventory Transactions</div>
                        <div className="text-sm text-gray-500">
                            {uploading
                                ? 'Uploading...'
                                : success
                                  ? `Uploaded ${count} records`
                                  : error
                                    ? error
                                    : 'Upload Excel file (All_Inventory_Transactions_by_Date)'}
                        </div>
                    </div>

                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                    />
                </div>
            </label>

            {success && (
                <div className="text-sm text-green-600 px-2">
                    ✓ Successfully uploaded {count} inventory transactions
                </div>
            )}
        </div>
    );
}
