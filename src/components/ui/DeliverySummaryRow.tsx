import React from 'react';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';

export type DeliverySummaryRowProps = {
    date: Date;
    organization: string;
    name?: string;
    totalPounds: number;
    /** "Minimally processed" | "Processed" | null (shows "Not specified") */
    processingTag?: string | null;
    /** Food type e.g. Bread, Canned Corn */
    foodType?: string | null;
    id: number;
    onClick?: () => void;
    /** "distribution" = 5 cols (Date, Org, Food, Weight, Tags); default = 3 cols (Date, Partner, Pounds) + optional chevron */
    variant?: 'summary' | 'distribution';
};

const ProcessingTag: React.FC<{ value: string | null | undefined }> = ({ value }) => {
    const label = value && value.trim() ? value : 'Not specified';
    const isProcessed = label.toLowerCase() === 'processed';
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                isProcessed
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}
        >
            {label}
        </span>
    );
};

const FoodTypeTag: React.FC<{ value: string | null | undefined }> = ({ value }) => {
    const label = value && value.trim() ? value : '—';
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            {label}
        </span>
    );
};

const DeliverySummaryRow: React.FC<DeliverySummaryRowProps> = ({
    date,
    organization,
    name,
    totalPounds,
    processingTag,
    foodType,
    onClick,
    variant = 'summary',
}) => {
    const hasName = name != null && name !== '';
    const isDistribution = variant === 'distribution';

    if (isDistribution) {
        return (
            <div
                className={`grid items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-b-0 transition-colors ${
                    onClick ? 'cursor-pointer hover:bg-slate-50/80' : ''
                }`}
                style={{
                    gridTemplateColumns: '100px 1fr 140px 88px minmax(140px, auto)',
                }}
                onClick={onClick}
                role={onClick ? 'button' : undefined}
            >
                <div className="text-[13px] text-slate-600 tabular-nums">
                    {format(new Date(date), 'M/d/yyyy')}
                </div>
                <div
                    className="text-[13px] text-slate-900 min-w-0 truncate font-medium"
                    title={organization}
                >
                    {organization}
                </div>
                <div className="text-[13px] text-slate-600 min-w-0 truncate">
                    {hasName ? name : '—'}
                </div>
                <div className="text-[13px] font-medium tabular-nums text-slate-900 text-right">
                    {totalPounds.toLocaleString()} lbs
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <ProcessingTag value={processingTag} />
                    <FoodTypeTag value={foodType} />
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="grid grid-cols-[100px_1fr_72px_auto] items-center gap-4 px-4 py-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer group"
        >
            <div className="text-xs text-gray-600 tabular-nums">
                {new Date(date).toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                })}
            </div>
            <div className="text-xs font-medium text-gray-900 min-w-0 truncate" title={organization}>
                {organization}
            </div>
            <div className="text-xs font-medium text-right tabular-nums text-[#608D6A]">
                {totalPounds.toLocaleString()} lbs
            </div>
            {onClick && <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />}
        </div>
    );
};

export default DeliverySummaryRow;
