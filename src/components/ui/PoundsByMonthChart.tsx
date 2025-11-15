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
 * PoundsByMonthChart Component
 **/
export const PoundsByMonthChart: React.FC<PoundsByMonthChartProps> = ({
    data = DEFAULT_DATA,
    title = 'Pounds Donated By Month',
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                                fill: '#6B7280',
                                fontSize: 12,
                            }}
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
                            formatter={value => `${value} lbs`}
                        />
                        <Bar
                            dataKey="pounds"
                            fill="#86EFAC"
                            radius={[8, 8, 0, 0]}
                            isAnimationActive={true}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
