'use client';

import React, { useState, useEffect } from 'react';
import { Pie, PieChart, Tooltip, ResponsiveContainer, Cell, Sector, SectorProps } from 'recharts';
import { Apple } from 'lucide-react';

// Sample data for when no data is provided
const DEFAULT_DATA = [
    { label: 'High Protein', value: 120, color: '#F9DC70' },
    { label: 'Vegetables', value: 220, color: '#6CAEE6' },
    { label: 'Dairy', value: 320, color: '#A1C5B0' },
    { label: 'Grains', value: 420, color: '#E7A54E' },
];

export interface FoodTypeData {
    label: string;
    value: number;
    color: string;
}

interface FoodTypesDonutChartProps {
    data?: FoodTypeData[];
    title?: string;
}

// Hovering logic
const renderActiveShape = (props: SectorProps) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius ? outerRadius + 8 : innerRadius}
                cornerRadius={5}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
        </g>
    );
};

export function FoodTypesDonutChart({
    data = DEFAULT_DATA,
    title = 'Food Types Donated',
}: FoodTypesDonutChartProps) {
    const [chartHeight, setChartHeight] = useState<number>(300);

    useEffect(() => {
        const update = () => {
            const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
            if (w < 640) setChartHeight(220);
            else if (w < 1024) setChartHeight(260);
            else setChartHeight(300);
        };

        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return (
        <div className="w-full max-w-[900px] p-2">
            <div className="px-4 py-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="flex flex-col lg:flex-row items-center gap-8">
                    <div className="relative w-full sm:flex-1 sm:max-w-[420px] mx-auto min-h-[220px]">
                        <div style={{ width: '100%', height: chartHeight }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        dataKey="value"
                                        nameKey="label"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={Math.max(30, chartHeight * 0.25)}
                                        outerRadius={Math.max(60, chartHeight * 0.45)}
                                        cornerRadius={6}
                                        activeShape={renderActiveShape}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <Apple className="h-8 w-8 text-gray-400" />
                        </div>
                    </div>

                    {/* custom legend, centered vertically */}
                    <div className="flex flex-col gap-4 justify-center lg:pl-6">
                        {data.map((item, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <div
                                    className="w-3.5 h-3.5 rounded-full"
                                    style={{ backgroundColor: item.color || '#8884d8' }}
                                />
                                <span className="text-sm text-gray-800">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
