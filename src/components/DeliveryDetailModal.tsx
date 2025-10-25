'use client';
import React, { useEffect, useRef, useState } from 'react';
import Note from './ui/Notes';

export default function DeliveryDetailModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // TESTING VARIABLES
    const [partner, setPartner] = useState('XXXXXXXXXX');
    const [weight, setWeight] = useState('XX.XX');
    const [program, setProgram] = useState('Food Program 1');

    // The modal closes when user presses "ESC" key
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            id="delivery-detail-scrim"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            aria-modal
            role="dialog"
        >
            {/* Sizing for different screens */}
            <div
                ref={dialogRef}
                className="
          relative
          w-full
          max-w-[95vw]
          sm:max-w-[200vw]
          md:max-w-[700px]
          lg:max-w-[850px]
          rounded-2xl
          bg-white
          shadow-xl
          ring-1
          ring-black/5
          transition-all
          duration-200
        "
            >
                {/* Header */}
                <div className="relative border-b border-neutral-200/70 px-6 sm:px-8 py-4">
                    {/* Close button */}
                    <button
                        aria-label="Close"
                        onClick={onClose}
                        className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 active:bg-neutral-200"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-5 w-5 text-amber-700"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                    <h2 className="text-center text-xl sm:text-2xl font-semibold text-green-800">
                        Delivery Detail
                    </h2>
                </div>

                {/* Body */}
                <div className="px-6 sm:px-8 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left column */}
                        <div className="lg:col-span-6 space-y-8">
                            {/* Partner */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-neutral-700">
                                    Partner:
                                </label>
                                <input
                                    value={partner}
                                    readOnly
                                    className="w-full rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-2 text-neutral-800 cursor-default"
                                />
                            </div>

                            {/* Food Rescue Program */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-neutral-700">
                                    Food Rescue Program:
                                </label>
                                <input
                                    value={program}
                                    readOnly
                                    className="w-full rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-2 text-neutral-800 cursor-default"
                                />
                            </div>

                            {/* Weight */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-neutral-700">
                                    Weight
                                </label>
                                <div className="relative">
                                    <input
                                        value={weight}
                                        readOnly
                                        className="w-full rounded-lg border border-neutral-300 bg-neutral-100 pr-12 pl-4 py-2 text-neutral-800 cursor-default"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-600">
                                        lbs
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="lg:col-span-6">
                            <div className="rounded-xl border border-neutral-300 bg-neutral-50/60 p-3 sm:p-4 lg:p-5">
                                <Note />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
