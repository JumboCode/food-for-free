'use client';

import { useState } from 'react';
import DeliveryDetailModal from '@/components/DeliveryDetailModal';

export default function HomePage() {
    const [open, setOpen] = useState(false);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-neutral-50">
            {/* Trigger button */}
            <button
                onClick={() => setOpen(true)}
                className="rounded-lg bg-green-700 text-white px-6 py-3 text-lg hover:bg-green-800 transition-colors"
            >
                Open Delivery Detail
            </button>

            {/* The Delivery Detail popup */}
            <DeliveryDetailModal open={open} onClose={() => setOpen(false)} />
        </main>
    );
}
