import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
    label: string;
    value: string | number;
    unit?: string;
    icon?: React.ReactElement;
}

export function StatCard({ label, value, unit, icon }: StatCardProps) {
    return (
        <Card className="w-full max-w-sm gap-2">
            <CardContent className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    {icon && <div className="h-5 w-5 text-blue-400">{icon}</div>}
                </div>
                <div className="flex items-end justify-between">
                    <div className="text-4xl font-bold text-gray-900 pt-2">{value}</div>
                    {unit && <span className="text-xl font-medium text-gray-900 pb-1">{unit}</span>}
                </div>
            </CardContent>
        </Card>
    );
}
