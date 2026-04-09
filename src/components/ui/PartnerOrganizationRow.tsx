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
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)_56px] items-center gap-x-2 sm:gap-x-4 px-3 py-3 sm:px-6 text-sm text-gray-900 transition-colors hover:bg-[#F7FAF7] cursor-pointer"
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
