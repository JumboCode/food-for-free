import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
    label: string;
    value: string | number;
    unit?: string;
    icon?: React.ReactElement;
}

export function StatCard({ label, value, unit, icon }: StatCardProps) {
    return (
        <Card className="relative w-full overflow-hidden border border-slate-100 bg-white/70 shadow-sm py-0 gap-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
            <CardContent className="min-w-0 px-3 py-1.5 sm:px-4 sm:py-2 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {label}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-1">
                            <span className="text-lg sm:text-xl font-semibold text-slate-900 tabular-nums">
                                {value}
                            </span>
                            {unit && (
                                <span className="text-xs font-medium text-slate-500">
                                    {unit}
                                </span>
                            )}
                        </div>
                    </div>
                    {icon && (
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-sky-500">
                            {icon}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}