'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
    if (!isOpen) return null;

    // Helper to assign pastel colors to tags consistent with the design
    const getTagColor = (index: number) => {
        const colors = [
            'bg-orange-100 text-orange-800',
            'bg-green-100 text-green-800',
            'bg-red-100 text-red-800',
            'bg-blue-100 text-blue-800',
            'bg-purple-100 text-purple-800',
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* Modal Container using Card for consistent styling */}
            <Card className="relative w-full max-w-[800px] bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-0 rounded-xl">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 text-gray-500 hover:text-gray-900 transition-colors z-10 p-1 hover:bg-gray-100 rounded-full"
                    aria-label="Close modal"
                >
                    <X size={24} />
                </button>

                <CardContent className="p-0 flex flex-col h-full overflow-hidden">
                    {/* Header Section */}
                    <div className="px-10 pt-10 pb-6 flex-shrink-0">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Delivery Detail</h2>
                        <p className="text-xl text-gray-600 mb-8 font-medium">{date}</p>

                        <div className="space-y-3 mb-8">
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

                        {nutritionalTags.length > 0 && (
                            <div className="mb-2">
                                <p className="text-gray-900 font-semibold mb-3">
                                    Nutritional Tags:
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {nutritionalTags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className={`px-4 py-1.5 rounded-md text-sm font-semibold ${getTagColor(index)}`}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Scrollable Table Section */}
                    <div className="px-10 pb-10 flex-1 overflow-hidden flex flex-col">
                        <h3 className="text-gray-900 font-semibold mb-3">Foods Delivered:</h3>

                        <div className="border border-gray-200 rounded-xl overflow-y-auto flex-1 custom-scrollbar">
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DeliveryDetailPopup;
