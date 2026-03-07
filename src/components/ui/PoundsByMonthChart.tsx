'use client';

import React, { useRef, useState, useLayoutEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

export interface PoundsData {
    month: string;
    pounds: number;
}

interface PoundsByMonthChartProps {
    data?: PoundsData[];
    title?: string;
    dateRange?: { start: Date; end: Date };
    activeFilter?: string | null;
}

const DEFAULT_DATA: PoundsData[] = [
    { month: 'Jan', pounds: 320 },
    { month: 'Feb', pounds: 410 },
    { month: 'Mar', pounds: 380 },
    { month: 'Apr', pounds: 450 },
    { month: 'May', pounds: 400 },
    { month: 'Jun', pounds: 420 },
    { month: 'Jul', pounds: 350 },
    { month: 'Aug', pounds: 430 },
    { month: 'Sep', pounds: 390 },
    { month: 'Oct', pounds: 400 },
    { month: 'Nov', pounds: 480 },
    { month: 'Dec', pounds: 420 },
];

function formatDateRange(range: { start: Date; end: Date } | undefined): string {
    if (!range) return 'selected time range';
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${range.start.toLocaleDateString('en-US', opts)} – ${range.end.toLocaleDateString('en-US', opts)}`;
}

export const PoundsByMonthChart: React.FC<PoundsByMonthChartProps> = ({
    data = DEFAULT_DATA,
    dateRange,
    activeFilter,
}) => {
    const displayData = data && data.length > 0 ? data : [];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const emptyDataWithLabels = monthNames.map(month => ({ month, pounds: 0 }));
    const chartData = displayData.length > 0 ? displayData : emptyDataWithLabels;
    const hasData = displayData.length > 0;

    const barCount = chartData.length;
    const minBarWidth = 48;
    const minChartWidth = Math.max(barCount * minBarWidth, 320);
    const needsScrolling = barCount > 8;

    // Tight angled label height
    const xAxisHeight = needsScrolling ? 52 : 20;

    const maxPounds = Math.max(0, ...chartData.map(d => d.pounds));

    const getNiceYScale = (max: number): { domainMax: number; ticks: number[] } => {
        if (max <= 0) return { domainMax: 100, ticks: [0, 50, 100] };
        const padded = max * 1.15;
        const magnitude = Math.pow(10, Math.floor(Math.log10(padded)));
        const normalized = padded / magnitude;
        const step = magnitude * (normalized <= 2 ? 0.5 : normalized <= 5 ? 1 : 2);
        const domainMax = Math.ceil(padded / step) * step;
        const ticks: number[] = [];
        for (let t = 0; t <= domainMax; t += step) ticks.push(t);
        return { domainMax, ticks };
    };
    const { domainMax, ticks: yTicks } = getNiceYScale(maxPounds);

    const yAxisTickFormatter = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
        return String(value);
    };

    const containerRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(minChartWidth);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            const w = el.getBoundingClientRect().width;
            setChartWidth(Math.max(w, minChartWidth));
        });
        ro.observe(el);
        setChartWidth(Math.max(el.getBoundingClientRect().width, minChartWidth));
        return () => ro.disconnect();
    }, [minChartWidth]);

    const renderTooltip = (props: unknown) => {
        const { active, payload, label } = (props || {}) as { active?: boolean; payload?: Array<{ value?: number }>; label?: string | number };
        if (!active || !payload?.length || label == null) return null;
        const value = payload[0]?.value;
        return (
            <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm">
                <p className="text-xs font-medium text-black">
                    {String(label)}: {typeof value === 'number' ? value.toLocaleString() : value} lbs
                </p>
            </div>
        );
    };

    return (
        <Card className="gap-0 pt-0 pb-1">
            <CardContent className="px-3 py-3 sm:px-4 sm:py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Pounds delivered over {formatDateRange(dateRange)}
                </p>
                <div className="relative" ref={containerRef}>
                    {!hasData && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <p className="text-gray-500 bg-white/90 px-4 py-2 rounded-lg">
                                No data available for the selected date range
                            </p>
                        </div>
                    )}
                    <div className="overflow-x-auto min-w-0">
                        <div style={{ width: chartWidth, minWidth: chartWidth }}>
                            <BarChart
                                width={chartWidth}
                                height={260}
                                data={chartData}
                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                    angle={needsScrolling ? -45 : 0}
                                    textAnchor={needsScrolling ? 'end' : 'middle'}
                                    height={xAxisHeight}
                                    dy={4}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                    width={44}
                                    ticks={yTicks}
                                    tickFormatter={yAxisTickFormatter}
                                    domain={[0, domainMax]}
                                />
                                <Tooltip
                                    content={renderTooltip}
                                    cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
                                />
                                <Bar
                                    dataKey="pounds"
                                    fill="#B7D7BD"
                                    radius={[6, 6, 0, 0]}
                                    isAnimationActive={true}
                                />
                            </BarChart>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};