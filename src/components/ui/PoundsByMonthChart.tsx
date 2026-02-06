'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

//Mock data - 12 months of donation data
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

/**
 * PoundsByMonthChart Component - Adapts title and display based on date range
 **/
export const PoundsByMonthChart: React.FC<PoundsByMonthChartProps> = ({
    data = DEFAULT_DATA,
    title,
    dateRange,
    activeFilter,
}) => {
    // Determine appropriate title and aggregation level based on date range
    const getChartTitle = (): string => {
        if (title) return title;
        if (!dateRange) return 'Pounds Donated By Month';

        // If "All Time" is selected, show "By Year"
        if (activeFilter === 'allTime') {
            return 'Pounds Donated By Year';
        }

        const daysDiff = Math.ceil(
            (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
        );
        const yearsDiff =
            dateRange.end.getFullYear() -
            dateRange.start.getFullYear() +
            (dateRange.end.getMonth() - dateRange.start.getMonth()) / 12;

        if (daysDiff <= 30) {
            return 'Pounds Donated By Day';
        } else if (yearsDiff <= 2) {
            return 'Pounds Donated By Month';
        } else {
            return 'Pounds Donated By Year';
        }
    };

    const chartTitle = getChartTitle();

    // Ensure we always have data to display axes, even if empty
    const displayData = data && data.length > 0 ? data : [];

    // Generate labels for empty data case
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
    const hasData = displayData.length > 0;

    // Determine if we need horizontal scrolling (more than 12 data points)
    const needsScrolling = chartData.length > 12;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{chartTitle}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    {!hasData && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <p className="text-gray-500 bg-white/90 px-4 py-2 rounded-lg">
                                No data available for the selected date range
                            </p>
                        </div>
                    )}
                    <div className={needsScrolling ? 'overflow-x-auto pb-2' : ''}>
                        <div
                            style={{
                                minWidth: needsScrolling
                                    ? `${Math.max(chartData.length * 60, 800)}px`
                                    : '100%',
                                width: needsScrolling
                                    ? `${Math.max(chartData.length * 60, 800)}px`
                                    : '100%',
                            }}
                        >
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={chartData}
                                    margin={{
                                        top: 20,
                                        right: 30,
                                        left: 0,
                                        bottom: needsScrolling ? 60 : 0,
                                    }}
                                >
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: '#6B7280',
                                            fontSize: 12,
                                        }}
                                        angle={needsScrolling ? -45 : 0}
                                        textAnchor={needsScrolling ? 'end' : 'middle'}
                                        height={needsScrolling ? 80 : 30}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: '#6B7280',
                                            fontSize: 12,
                                        }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#FFFFFF',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px',
                                        }}
                                        cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
                                        labelFormatter={label => label}
                                        formatter={value => [`${value} lbs`, 'Pounds']}
                                    />
                                    <Bar
                                        dataKey="pounds"
                                        fill="#B7D7BD"
                                        radius={[8, 8, 0, 0]}
                                        isAnimationActive={true}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
