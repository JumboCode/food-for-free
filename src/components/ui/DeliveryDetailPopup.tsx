'use client';

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
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
    const foodsScrollRef = useRef<HTMLDivElement>(null);
    const [foodsScrollState, setFoodsScrollState] = useState({
        canScroll: false,
        showBottomFade: false,
    });

    const updateFoodsScrollState = useCallback(() => {
        const el = foodsScrollRef.current;
        if (!el) return;
        const canScroll = el.scrollHeight > el.clientHeight + 1;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
        setFoodsScrollState({ canScroll, showBottomFade: canScroll && !atBottom });
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const el = foodsScrollRef.current;
        if (!el) return;
        updateFoodsScrollState();
        const ro = new ResizeObserver(() => updateFoodsScrollState());
        ro.observe(el);
        el.addEventListener('scroll', updateFoodsScrollState, { passive: true });
        return () => {
            ro.disconnect();
            el.removeEventListener('scroll', updateFoodsScrollState);
        };
    }, [isOpen, foodsDelivered, updateFoodsScrollState]);

    if (!isOpen) return null;

    const displayTags = nutritionalTags.filter(t => t.trim().toLowerCase() !== 'mixed processing');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* Modal Container using Card for consistent styling */}
            <Card className="relative flex min-h-0 w-full max-w-[800px] flex-col overflow-hidden rounded-xl border-0 bg-white shadow-2xl max-h-[90vh]">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-5 top-4 text-gray-500 hover:text-gray-900 transition-colors z-10 p-1 hover:bg-gray-100 rounded-full"
                    aria-label="Close modal"
                >
                    <X size={24} />
                </button>

                <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                    {/* Header Section */}
                    <div className="px-8 sm:px-10 pt-5 pb-4 flex-shrink-0">
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

                    {/* Scrollable Table Section */}
                    <div className="px-8 sm:px-10 pb-8 flex-1 min-h-0 overflow-hidden flex flex-col">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                            <h3 className="text-gray-900 font-semibold">Foods Delivered:</h3>
                            {foodsScrollState.canScroll && (
                                <span className="text-xs text-gray-500 font-medium">
                                    Scroll for more
                                </span>
                            )}
                        </div>

                        <div className="relative flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white">
                            <div
                                ref={foodsScrollRef}
                                className="min-h-[7.5rem] max-h-[min(42vh,20rem)] flex-1 overflow-y-auto overflow-x-hidden rounded-xl [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent"
                            >
                                <table className="w-full text-left border-collapse">
                                    <tbody className="bg-white">
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
                            {foodsScrollState.showBottomFade && (
                                <div
                                    className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-xl bg-gradient-to-t from-white via-white/90 to-transparent"
                                    aria-hidden
                                />
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DeliveryDetailPopup;
