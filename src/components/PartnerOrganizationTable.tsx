'use client';

import React, { useRef, useState } from 'react';

import PartnerOrganizationRow, { PartnerDataRow } from '@/components/ui/PartnerOrganizationRow';

const PartnerOrganizationTable: React.FC<{ data: PartnerDataRow[] }> = ({ data }) => {
    return (
        <div>
            <div className="grid grid-cols-[1fr_1fr_60px] items-center px-6 py-3 bg-[#fafaf8] rounded-sm mb-3 text-sm font-medium text-gray-700">
                <div>Organization Name</div>
                <div className="text-center">Number of Users</div>
                <div className="text-right">Details</div>
            </div>
            {data.map(partner => (
                <PartnerOrganizationRow
                    key={partner.id}
                    name={partner.name}
                    numOfUsers={partner.numOfUsers}
                    id={partner.id}
                    onClick={partner.onClick}
                />
            ))}
        </div>
    );
};

export default PartnerOrganizationTable;
