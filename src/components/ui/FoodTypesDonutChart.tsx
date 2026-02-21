'use client';

import { Pie, PieChart, Tooltip, ResponsiveContainer, Cell, Sector, SectorProps } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Apple } from 'lucide-react';

// Sample data for when no data is provided
const DEFAULT_DATA = [
    { label: 'High Protein', value: 120, color: '#F9DC70' },
    { label: 'Vegetables', value: 220, color: '#6CAEE6' },
    { label: 'Dairy', value: 320, color: '#A1C5B0' },
    { label: 'Grains', value: 420, color: '#E7A54E' },
];

export interface FoodTypeData {
    [key: string]: string | number;
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
    return (
        <Card className="w-full max-w-[600px] p-4">
            <CardHeader>
                <CardTitle className="whitespace-nowrap mt-3">{title}</CardTitle>
            </CardHeader>

            <CardContent className="flex items-center gap-8">
                <div className="relative w-1/2">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                innerRadius="50%"
                                outerRadius="80%"
                                cornerRadius={5}
                                activeShape={renderActiveShape}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Apple className="h-8 w-8 text-gray-500" />
                    </div>
                </div>

                {/* custom legend */}
                <div className="flex flex-col gap-2 ml-30">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color || '#8884d8' }}
                            />
                            <span className="text-sm">{item.label}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
