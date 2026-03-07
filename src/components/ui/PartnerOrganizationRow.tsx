import React from 'react';
import { ChevronRight } from 'lucide-react';

export type PartnerDataRow = {
    name: string;
    numOfUsers: number;
    id: string;
    onClick?: () => void;
};

const PartnerOrganizationRow: React.FC<PartnerDataRow> = ({ name, numOfUsers, onClick }) => {
    return (
        <div
            onClick={onClick}
            role="button"
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_60px] items-center px-6 py-3 text-sm text-gray-900 hover:bg-[#F7FAF7] transition-colors cursor-pointer"
        >
            <div className="truncate">{name}</div>
            <div className="text-center text-gray-700">{numOfUsers}</div>
            <div className="flex justify-end">
                <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
        </div>
    );
};

export default PartnerOrganizationRow;
