'use client';

import React, { useRef, useState } from 'react';

import PartnerOrganizationRow, { PartnerDataRow } from '@/components/ui/PartnerOrganizationRow';

const PartnerOrganizationTable: React.FC<{ data: PartnerDataRow[] }> = ({ data }) => {
    return (
        <div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_60px] items-center px-6 py-3 bg-[#fafaf8] text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div>Organization name</div>
                <div className="text-center">Number of users</div>
                <div className="text-right">Details</div>
            </div>
            <div className="divide-y divide-gray-100">
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
        </div>
    );
};

export default PartnerOrganizationTable;
