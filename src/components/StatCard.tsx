import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Statistic {
    label: string;
    value: string | number;
    icon?: React.ReactElement;
}

interface StatCardProps {
    title: string;
    statistics: Statistic[];
}

export function StatCard({ title, statistics }: StatCardProps) {
    return (
        <Card className="w-full max-w-sm gap-2">
            <CardHeader className="negative-margin-bottom-2">
                <CardTitle className="text-xl font-bold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
                {statistics.map((stat, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                        <div className="flex items-center gap-2">
                            {stat.icon && (
                                <div className="h-5 w-5 text-muted-foreground">{stat.icon}</div>
                            )}
                            <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
