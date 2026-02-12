import React from 'react';
import { ChevronRight } from 'lucide-react';

export type PartnerDataRow = {
    name: string;
    numOfUsers: number;
    id: number;
    onClick?: () => void;
};

const PartnerOrganizationRow: React.FC<PartnerDataRow> = ({ name, numOfUsers, onClick }) => {
    return (
        <div
            className="flex items-center gap-4 p-4 bg-[#e7f3eb] rounded-lg mb-2 cursor-pointer hover:bg-[#fce6c4]"
            onClick={onClick}
        >
            <span className="flex-1">{name}</span>
            <span className="w-32 text-center">{numOfUsers}</span>
            <ChevronRight className="h-5 w-5" />
        </div>
    );
};

export default PartnerOrganizationRow;
