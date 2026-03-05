import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
    label: string;
    value: string | number;
    unit?: string;
    icon?: React.ReactElement;
}

export function StatCard({ label, value, unit, icon }: StatCardProps) {
    return (
        <Card className="w-full gap-2 border-0 shadow overflow-hidden">
            <CardContent className="space-y-2 pt-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    {icon && <div className="h-5 w-5 text-blue-400">{icon}</div>}
                </div>
                <div className="flex items-end justify-between flex-wrap gap-1">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 pt-2 whitespace-nowrap">
                        {value}
                    </div>
                    {unit && <span className="text-xl font-medium text-gray-900 pb-1">{unit}</span>}
                </div>
            </CardContent>
        </Card>
    );
}
