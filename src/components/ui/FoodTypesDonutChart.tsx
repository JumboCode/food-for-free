'use client';

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
    [key: string]: string | number;
    label: string;
    value: number;
    color: string;
}

interface FoodTypesDonutChartProps {
    data?: FoodTypeData[];
    title?: string;
    className?: string;
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
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload as FoodTypeData;
    const total = payload[0].payload.total;
    const pct =
        typeof total === 'number' && total > 0 ? ((item.value / total) * 100).toFixed(1) : '—';
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
            <p className="text-sm font-medium text-slate-800">{item.label}</p>
            <p className="text-xs text-slate-500">
                {Number(item.value).toLocaleString()} lbs ({pct}%)
            </p>
        </div>
    );
}

export function FoodTypesDonutChart({
    data = DEFAULT_DATA,
    title = 'Food Types Donated',
    className = '',
}: FoodTypesDonutChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const dataWithTotal = data.map(d => ({ ...d, total }));

    /** Fixed donut + legend row height so “Processing” matches “Food types” when one has fewer legend rows. */
    const CHART_ROW_MIN = 'min-h-[300px] sm:min-h-[320px]';
    const DONUT_BOX = 'h-[220px] w-[220px] shrink-0 sm:h-[240px] sm:w-[240px]';

    return (
        <div className={`flex h-full min-h-0 w-full flex-col ${className}`.trim()}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {title}
            </h3>
            <div
                className={`mt-3 flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6 ${CHART_ROW_MIN}`}
            >
                <div className={`relative ${DONUT_BOX}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={dataWithTotal}
                                dataKey="value"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                innerRadius="52%"
                                outerRadius="78%"
                                cornerRadius={6}
                                stroke="none"
                                paddingAngle={1}
                                activeShape={renderActiveShape}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex flex-col items-center">
                            <Apple className="h-7 w-7 text-slate-300 sm:h-8 sm:w-8" />
                            <span className="mt-0.5 text-xs font-medium tabular-nums text-slate-500">
                                {total.toLocaleString()} lbs
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex w-full min-w-0 flex-1 flex-col justify-center gap-2 sm:max-w-none sm:gap-2.5">
                    {data.map((item, index) => {
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                        return (
                            <div
                                key={index}
                                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-2">
                                    <div
                                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: item.color || '#94a3b8' }}
                                    />
                                    <span className="break-words text-sm font-medium leading-snug text-slate-800">
                                        {item.label}
                                    </span>
                                </div>
                                <div className="shrink-0 self-center text-right">
                                    <span className="text-xs font-medium tabular-nums text-slate-600">
                                        {item.value.toLocaleString()}
                                    </span>
                                    <span className="ml-0.5 text-xs text-slate-400">({pct}%)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
