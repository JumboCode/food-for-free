import React from 'react';
import { ChevronRight } from 'lucide-react';

export type DeliverySummaryRowProps = {
    date: Date;
    totalPounds: number;
    id: number;
    onClick?: () => void;
};

const DeliverySummaryRow: React.FC<DeliverySummaryRowProps> = ({
    date,
    totalPounds,
    id,
    onClick,
}) => {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between px-6 py-4 bg-[#B7D7BD] hover:bg-[#FBE6C4] text-[#608D6A] hover:text-black border-b border-white cursor-pointer transition-all duration-200"
        >
            <div className="flex items-center gap-4">
                {date.toLocaleDateString()}
            </div>
            <span className="font-medium">{totalPounds}lbs</span>
            <ChevronRight className="h-5 w-5" />
        </div>
    );
};

export default DeliverySummaryRow;
