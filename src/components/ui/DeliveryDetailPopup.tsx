'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
    chipStyleFromDonutHex,
    foodTypeFixedHex,
    processingDisplayLabel,
    processingChipStyle,
} from '~/lib/chartCompositionColors';

function tagChipStyle(tag: string): {
    backgroundColor: string;
    borderColor: string;
    color: string;
} {
    const label = tag.trim();
    if (!label) return chipStyleFromDonutHex(foodTypeFixedHex('Other'));

    if (label === processingDisplayLabel(true)) return processingChipStyle(true);
    if (label === processingDisplayLabel(false)) return processingChipStyle(false);
    if (label === processingDisplayLabel(null)) return processingChipStyle(null);

    return chipStyleFromDonutHex(foodTypeFixedHex(label));
}

export interface FoodItem {
    name: string;
    weight: string;
}

export interface DeliveryDetailPopupProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    organizationName: string;
    totalPounds: string;
    nutritionalTags?: string[];
    foodsDelivered?: FoodItem[];
}

/**
 * DeliveryDetailPopup Component
 * Displays detailed information about a single delivery in a modal overlay.
 */
const DeliveryDetailPopup: React.FC<DeliveryDetailPopupProps> = ({
    isOpen,
    onClose,
    date,
    organizationName,
    totalPounds,
    nutritionalTags = [],
    foodsDelivered = [],
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showScrollHint, setShowScrollHint] = useState(false);

    const updateScrollHint = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const canScroll = el.scrollHeight > el.clientHeight + 1;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
        setShowScrollHint(canScroll && !atBottom);
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const el = scrollRef.current;
        if (!el) return;
        updateScrollHint();
        const ro = new ResizeObserver(updateScrollHint);
        ro.observe(el);
        el.addEventListener('scroll', updateScrollHint, { passive: true });
        return () => {
            ro.disconnect();
            el.removeEventListener('scroll', updateScrollHint);
        };
    }, [isOpen, foodsDelivered, updateScrollHint]);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const displayTags = nutritionalTags.filter(t => t.trim().toLowerCase() !== 'mixed processing');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="relative flex w-full max-w-[800px] flex-col overflow-hidden rounded-xl border-0 bg-white shadow-2xl max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute right-5 top-4 text-gray-500 hover:text-gray-900 transition-colors z-10 p-1 hover:bg-gray-100 rounded-full"
                    aria-label="Close modal"
                >
                    <X size={24} />
                </button>

                <CardContent ref={scrollRef} className="flex flex-col overflow-y-auto p-0">
                    {/* Header */}
                    <div className="px-8 sm:px-10 pt-5 pb-4 shrink-0">
                        <h2 className="text-3xl font-bold text-gray-900 mb-1">Delivery Detail</h2>
                        <p className="text-xl text-gray-600 mb-4 font-medium">{date}</p>

                        <div className="space-y-3 mb-5">
                            <div className="flex gap-4 items-baseline">
                                <span className="text-gray-900 font-semibold w-32">
                                    Organization:
                                </span>
                                <span className="text-gray-600 font-medium uppercase tracking-wide">
                                    {organizationName}
                                </span>
                            </div>
                            <div className="flex gap-4 items-baseline">
                                <span className="text-gray-900 font-semibold w-32">Total Lbs:</span>
                                <span className="text-gray-600 font-medium">{totalPounds}</span>
                            </div>
                        </div>

                        {displayTags.length > 0 && (
                            <div className="mb-1">
                                <p className="text-gray-900 font-semibold mb-2">
                                    Nutritional Tags:
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {displayTags.map((tag, i) => (
                                        <span
                                            key={`${tag}-${i}`}
                                            className="inline-flex items-center rounded-md border px-4 py-1.5 text-sm font-semibold"
                                            style={tagChipStyle(tag)}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-8 sm:px-10 pb-8">
                        <p className="text-gray-900 font-semibold mb-2">Foods Delivered:</p>
                        <div className="rounded-xl border border-gray-200">
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    {foodsDelivered.map((food, index) => (
                                        <tr
                                            key={index}
                                            className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="p-4 pl-6 text-gray-700 font-medium">
                                                {food.name}
                                            </td>
                                            <td className="p-4 pr-6 text-right text-gray-600 font-medium w-40">
                                                {food.weight}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>

                {/* visible at bottom of card only when more content is below */}
                {showScrollHint && (
                    <div className="pointer-events-none absolute bottom-0 inset-x-0 flex justify-center pb-3 pt-8 bg-linear-to-t from-white to-transparent rounded-b-xl">
                        <span className="text-xs text-gray-400 font-medium">Scroll for more ↓</span>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DeliveryDetailPopup;
