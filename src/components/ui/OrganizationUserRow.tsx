import React from 'react';
import { ChevronDown } from 'lucide-react';

export type UserDataRow = {
    id: number;
    name: string;
    email: string;
    status: string;
    onClick?: () => void;
};

const OrganizationUserRow: React.FC<UserDataRow> = ({ name, email, status, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between gap-4 p-4 bg-#e5f3ea rounded-lg mb-2 cursor-pointer hover:bg-#fce5c3"
        >
            <span>{name}</span>
            <span>{email}</span>
            <span>{status}</span>
            <ChevronDown className="h-5 w-5" />
        </div>
    );
};

export default PartnerOrganizationRow;
