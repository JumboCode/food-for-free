import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string | number;
    unit?: string;
    /** Shown after the unit (e.g. delivery count in parentheses). */
    suffix?: string;
    icon?: React.ReactElement;
    /** When true, card fills its grid cell (lg+); use with equal-height stat rows. */
    fillHeight?: boolean;
    className?: string;
}

export function StatCard({
    label,
    value,
    unit,
    suffix,
    icon,
    fillHeight,
    className,
}: StatCardProps) {
    return (
        <Card
            className={cn(
                'relative w-full overflow-hidden border border-slate-100 bg-white/70 shadow-sm py-0 gap-0',
                fillHeight && 'flex min-h-0 flex-col max-lg:h-auto lg:h-full lg:min-h-0',
                className
            )}
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
            <CardContent
                className={cn(
                    'min-w-0 px-3 py-1.5 sm:px-4 sm:py-2 flex flex-col justify-center',
                    fillHeight && 'min-h-0 max-lg:flex-none lg:flex-1'
                )}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {label}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0">
                            <span className="text-lg sm:text-xl font-semibold text-slate-900 tabular-nums">
                                {value}
                            </span>
                            {unit && (
                                <span className="text-xs font-medium text-slate-500">{unit}</span>
                            )}
                            {suffix ? (
                                <span className="text-xs font-medium text-slate-500 tabular-nums">
                                    {suffix}
                                </span>
                            ) : null}
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
