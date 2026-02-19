import React from 'react';
import { ChevronRight } from 'lucide-react';

export type DistributionPageRowProps = {
    date: Date;
    organization: string;
    name: string;
    totalPounds: number;
    tags?: string[];
    id: number;
    onClick?: () => void;
};

const DistributionPageRow: React.FC<DistributionPageRowProps> = ({
    date,
    organization,
    name,
    totalPounds,
    tags,
    id,
    onClick,
}) => {
    return (
        <div
            onClick={onClick}
            className="flex grid text-left grid-cols-5 items-center justify-between px-6 py-4 bg-[#FFFFFF] hover:bg-[#FBE6C4] text-[#608D6A] hover:text-black border-b border-white cursor-pointer transition-all duration-200"
        >
            <div className="flex items-center gap-4">{date.toLocaleDateString()}</div>
            <div className="flex items-center gap-4">{organization}</div>
            <div className="flex items-center gap-4">{name}</div>
            <div className="flex items-center gap-4">{totalPounds} lbs</div>
            <div className="flex items-center gap-4 rounded-lg bg-[#A8B3E3] px-3 py-1 text-[#FFFFFF] text-sm">
                {tags?.join(', ')}
            </div>
        </div>
    );
};

export default DistributionPageRow;
