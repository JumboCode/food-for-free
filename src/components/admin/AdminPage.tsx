'use client';

import { useState, useEffect, useCallback } from 'react';
import DeliveryDetailPopup, { FoodItem } from '@/components/ui/DeliveryDetailPopup';

// Shape returned by GET /api/overview/delivery (existing list endpoint)
interface DeliveryRow {
    id: string; // "YYYY-MM-DD|destination" composite key
    date: string;
    totalPounds: number;
    destination: string | null;
}

interface DeliveryDetail {
    date: string;
    organizationName: string;
    totalPounds: number;
    nutritionalTags: string[];
    foodsDelivered: FoodItem[];
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function AdminDeliveriesTab() {
    const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<DeliveryDetail | null>(null);

    useEffect(() => {
        const fetchDeliveries = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Existing endpoint — no destination param = all orgs
                const res = await fetch('/api/overview/deliveries');
                if (!res.ok) throw new Error('Failed to load deliveries');
                const data = await res.json();
                setDeliveries(data.deliveries);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDeliveries();
    }, []);

    const handleRowClick = useCallback(async (deliveryId: string) => {
        // Split the existing "YYYY-MM-DD|destination" key
        const pipeIndex = deliveryId.indexOf('|');
        if (pipeIndex === -1) return;
        const date = deliveryId.slice(0, pipeIndex);
        const destination = deliveryId.slice(pipeIndex + 1);

        setIsLoadingDetail(true);
        setIsPopupOpen(true);
        setSelectedDetail(null);

        try {
            // Use existing detail endpoint with its query param signature
            const params = new URLSearchParams({ date, destination });
            const res = await fetch(`/api/overview/delivery?${params}`);
            if (!res.ok) throw new Error('Failed to load delivery detail');
            const data = await res.json();
            setSelectedDetail(data);
        } catch (err) {
            console.error('Error loading delivery detail:', err);
            setIsPopupOpen(false);
        } finally {
            setIsLoadingDetail(false);
        }
    }, []);

    const handleClose = useCallback(() => {
        setIsPopupOpen(false);
        setSelectedDetail(null);
    }, []);

    const filtered = deliveries.filter(d =>
        (d.destination ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by organization..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608D6A] focus:border-transparent"
                />
            </div>

            {isLoading ? (
                <div className="py-12 text-center text-gray-500">Loading deliveries...</div>
            ) : error ? (
                <div className="py-12 text-center text-red-500">{error}</div>
            ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-gray-500">No deliveries found.</div>
            ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                                    Organization
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                                    Total Pounds
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filtered.map(delivery => (
                                <tr
                                    key={delivery.id}
                                    onClick={() => handleRowClick(delivery.id)}
                                    className="hover:bg-[#E8F5E9] cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                        {formatDate(delivery.date)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {delivery.destination ?? '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                        {delivery.totalPounds.toLocaleString()} lbs
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isPopupOpen && isLoadingDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl px-12 py-8 shadow-2xl text-gray-600 text-lg">
                        Loading delivery details…
                    </div>
                </div>
            )}

            {selectedDetail && (
                <DeliveryDetailPopup
                    isOpen={isPopupOpen}
                    onClose={handleClose}
                    date={formatDate(selectedDetail.date)}
                    organizationName={selectedDetail.organizationName}
                    totalPounds={`${selectedDetail.totalPounds.toFixed(2)} lbs`}
                    nutritionalTags={selectedDetail.nutritionalTags}
                    foodsDelivered={selectedDetail.foodsDelivered}
                />
            )}
        </div>
    );
}
