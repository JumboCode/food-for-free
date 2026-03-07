import React from 'react';
import { ChevronRight } from 'lucide-react';

export type DeliverySummaryRowProps = {
    date: Date;
    organization: string;
    name?: string;
    totalPounds: number;
    maxPounds?: number;
    processingTag?: string;
    foodType?: string;
    tags?: string[];
    id: number;
    onClick?: () => void;
};

const DeliverySummaryRow: React.FC<DeliverySummaryRowProps> = ({
    date,
    organization,
    name,
    totalPounds,
    onClick,
}) => {
    const hasName = name != null && name !== '';
    return (
        <div
            onClick={onClick}
            className={`grid items-center gap-4 px-4 py-3.5 hover:bg-[#B7D7BD]/20 transition-colors cursor-pointer group ${
                hasName
                    ? 'grid-cols-[100px_1fr_120px_72px_auto]'
                    : 'grid-cols-[100px_1fr_72px_auto]'
            }`}
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
            {hasName && <div className="text-xs text-gray-600 min-w-0 truncate">{name}</div>}
            <div className="text-xs font-medium text-right tabular-nums text-[#608D6A]">
                {totalPounds.toLocaleString()} lbs
            </div>
            {onClick && <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />}
        </div>
    );
};

export default DeliverySummaryRow;
