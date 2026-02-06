import React from 'react';
import { ChevronDown } from 'lucide-react';

export type PartnerDataRow = {
    name: string;
    numOfUsers: number;
    id: number;
    onClick?: () => void;
};

const PartnerOrganizationRow: React.FC<PartnerDataRow> = ({ name, numOfUsers, onClick }) => {
    return (
        <div
            className="flex items-center justify-between gap-4 p-4 bg-[#e7f3eb] rounded-lg mb-2 cursor-pointer hover:bg-[#fce6c4]"
            onClick={onClick}
        >
            <span>{name}</span>
            <span>{numOfUsers}</span>
            <ChevronDown className="h-5 w-5" />
        </div>
    );
};

export default PartnerOrganizationRow;
