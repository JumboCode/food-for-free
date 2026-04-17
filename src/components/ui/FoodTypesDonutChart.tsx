'use client';

import { Pie, PieChart, Tooltip, ResponsiveContainer, Cell, Sector, SectorProps } from 'recharts';
import { Apple } from 'lucide-react';
import React from 'react';

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

const renderActiveShape = (props: SectorProps) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius ? outerRadius + 6 : innerRadius}
                cornerRadius={6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
            />
        </g>
    );
};

type CustomTooltipProps = {
    active?: boolean;
    payload?: Array<{ payload: FoodTypeData & { total?: number } }>;
    setIsTooltipActive: (active: boolean) => void;
};

function CustomTooltip({ active, payload, setIsTooltipActive }: CustomTooltipProps) {
    React.useEffect(() => {
        setIsTooltipActive(!!active);
    }, [active, setIsTooltipActive]);
    if (!active || !payload?.length) return null;
    const item = payload[0].payload as FoodTypeData;
    const total = payload[0].payload.total;
    const pct =
        typeof total === 'number' && total > 0 ? ((item.value / total) * 100).toFixed(1) : '—';
    return (
        <div
            className="rounded-lg border border-gray-400 bg-white px-4 py-3 shadow-lg"
            style={{
                opacity: 1,
                color: '#1a202c',
                fontWeight: 600,
                fontSize: '1rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
        >
            <p style={{ margin: 0 }}>{item.label}</p>
            <p style={{ margin: 0, fontWeight: 400, fontSize: '0.95rem', color: '#4a5568' }}>
                {Number(item.value).toLocaleString()} lbs ({pct}%)
            </p>
        </div>
    );
}

export function FoodTypesDonutChart({
    data = DEFAULT_DATA,
    title = 'Food Types Donated',
}: FoodTypesDonutChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const hasData = data.some(d => Number(d.value) > 0);
    const dataWithTotal = data.map(d => ({ ...d, total }));

    // Remove tooltip fade logic
    return (
        <div className="flex h-full w-full flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {title}
            </h3>
            {hasData ? (
                <div className="mt-1 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 sm:flex-row sm:items-stretch sm:gap-4">
                    <div className="relative h-[235px] w-full min-w-0 max-w-[235px] sm:h-[250px] sm:max-w-[250px] sm:self-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataWithTotal}
                                    dataKey="value"
                                    nameKey="label"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="56%"
                                    outerRadius="84%"
                                    cornerRadius={6}
                                    stroke="none"
                                    paddingAngle={1}
                                    activeShape={renderActiveShape}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={<CustomTooltip setIsTooltipActive={() => {}} />}
                                    wrapperStyle={{ pointerEvents: 'auto', zIndex: 10 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            style={{ zIndex: 0 }}
                        >
                            <div className="flex flex-col items-center">
                                <Apple
                                    className="h-7 w-7 text-slate-500 sm:h-8 sm:w-8"
                                    style={{ opacity: 1 }}
                                />
                                <span
                                    className="mt-0.5 text-xs font-medium tabular-nums text-slate-700"
                                    style={{ opacity: 1 }}
                                >
                                    {total.toLocaleString()} lbs
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 pr-1 sm:gap-2">
                        {data.map((item, index) => {
                            const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                            return (
                                <div
                                    key={index}
                                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5 sm:px-3 sm:py-2"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <div
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: item.color || '#94a3b8' }}
                                        />
                                        <span className="min-w-0 wrap-break-word text-xs font-medium leading-tight text-slate-800 sm:text-sm">
                                            {item.label}
                                        </span>
                                    </div>
                                    <div className="shrink-0 whitespace-nowrap pl-2 text-right">
                                        <span className="text-[11px] font-medium tabular-nums text-slate-600 sm:text-xs">
                                            {item.value.toLocaleString()}
                                        </span>
                                        <span className="ml-0.5 text-[11px] text-slate-400 sm:text-xs">
                                            ({pct}%)
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="mt-1 flex min-h-0 flex-1 items-center justify-center">
                    <p className="px-3 py-2 text-center text-sm text-slate-500">
                        No data available for the selected date range
                    </p>
                </div>
            )}
        </div>
    );
}
