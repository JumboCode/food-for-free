'use client';

import React, { useRef, useState, useLayoutEffect, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface PoundsData {
    month: string;
    pounds: number;
}

interface PoundsByMonthChartProps {
    data?: PoundsData[];
    title?: string;
    dateRange?: { start: Date; end: Date };
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
}) => {
    const displayData = data && data.length > 0 ? data : [];
    const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ];
    const emptyDataWithLabels = monthNames.map(month => ({ month, pounds: 0 }));
    const chartData = displayData.length > 0 ? displayData : emptyDataWithLabels;
    const hasData = displayData.some(d => Number(d.pounds) > 0);

    const barCount = chartData.length;
    const rangeStartMs = dateRange?.start?.getTime();
    const rangeEndMs = dateRange?.end?.getTime();
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const hasAutoScrolledToEndRef = useRef(false);
    const [chartWidth, setChartWidth] = useState(minChartWidth);
    const [scrollUI, setScrollUI] = useState({
        hasOverflow: false,
        canScrollLeft: false,
        canScrollRight: false,
    });

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

    const updateScrollUI = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const hasOverflow = el.scrollWidth - el.clientWidth > 12;
        const canScrollLeft = el.scrollLeft > 1;
        const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
        setScrollUI({ hasOverflow, canScrollLeft, canScrollRight });
    }, []);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const onScroll = () => {
            updateScrollUI();
        };

        updateScrollUI();
        el.addEventListener('scroll', onScroll, { passive: true });
        const ro = new ResizeObserver(() => updateScrollUI());
        ro.observe(el);

        return () => {
            el.removeEventListener('scroll', onScroll);
            ro.disconnect();
        };
    }, [chartWidth, updateScrollUI]);

    useEffect(() => {
        hasAutoScrolledToEndRef.current = false;
    }, [barCount, rangeStartMs, rangeEndMs]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el || hasAutoScrolledToEndRef.current) return;
        const hasOverflow = el.scrollWidth - el.clientWidth > 1;
        if (!hasOverflow || !needsScrolling) {
            updateScrollUI();
            return;
        }
        el.scrollLeft = el.scrollWidth;
        hasAutoScrolledToEndRef.current = true;
        updateScrollUI();
    }, [chartWidth, needsScrolling, updateScrollUI]);

    const scrollRight = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const step = Math.max(180, Math.round(el.clientWidth * 0.55));
        el.scrollBy({ left: step, behavior: 'smooth' });
    };

    const scrollLeft = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const step = Math.max(180, Math.round(el.clientWidth * 0.55));
        el.scrollBy({ left: -step, behavior: 'smooth' });
    };

    const renderTooltip = (props: unknown) => {
        const { active, payload, label } = (props || {}) as {
            active?: boolean;
            payload?: Array<{ value?: number }>;
            label?: string | number;
        };
        if (!active || !payload?.length || label == null) return null;
        const value = payload[0]?.value;
        return (
            <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm">
                <p className="text-xs font-medium text-black">
                    {String(label)}: {typeof value === 'number' ? value.toLocaleString() : value}{' '}
                    lbs
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
                            <p className="px-4 py-2 text-sm text-gray-500">
                                No data available for the selected date range
                            </p>
                        </div>
                    )}
                    <div ref={scrollContainerRef} className="overflow-x-auto min-w-0">
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
                    {needsScrolling && scrollUI.hasOverflow && scrollUI.canScrollLeft ? (
                        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-16 bg-linear-to-r from-white via-white/95 to-transparent" />
                    ) : null}
                    {needsScrolling && scrollUI.hasOverflow && scrollUI.canScrollRight ? (
                        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-16 bg-linear-to-l from-white via-white/95 to-transparent" />
                    ) : null}
                    {needsScrolling && scrollUI.canScrollLeft ? (
                        <button
                            type="button"
                            onClick={scrollLeft}
                            className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#B7D7BD] bg-white/95 p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-[#F4FAF5] hover:text-[#3E6C49]"
                            aria-label="Scroll chart left"
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden />
                        </button>
                    ) : null}
                    {needsScrolling && scrollUI.canScrollRight ? (
                        <button
                            type="button"
                            onClick={scrollRight}
                            className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#B7D7BD] bg-white/95 p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-[#F4FAF5] hover:text-[#3E6C49]"
                            aria-label="Scroll chart right"
                        >
                            <ChevronRight className="h-4 w-4" aria-hidden />
                        </button>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
};
