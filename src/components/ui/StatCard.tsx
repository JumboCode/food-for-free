import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    unit?: string;
    icon?: React.ReactElement;
}

export function StatCard({ label, value, unit, icon }: StatCardProps) {
    return (
        <div className="w-full max-w-sm">
            <div className="px-6 py-6">
                <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium text-gray-700">{label}</span>
                    {icon && <div className="h-5 w-5 text-blue-400">{icon}</div>}
                </div>
                <div className="flex items-end justify-between mt-3">
                    <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
                        {value}
                    </div>
                    {unit && (
                        <span className="text-base sm:text-lg md:text-xl font-medium text-gray-900">
                            {unit}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
