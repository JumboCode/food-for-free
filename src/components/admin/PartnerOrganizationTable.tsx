'use client';

import React, { useRef, useState } from 'react';

import PartnerOrganizationRow, { PartnerDataRow } from '@/components/ui/PartnerOrganizationRow';

const PartnerOrganizationTable: React.FC<{ data: PartnerDataRow[] }> = ({ data }) => {
    return (
        <div>
            <div className="flex items-center justify-between gap-4 p-4 bg-#e5f3ea rounded-lg mb-2 cursor-pointer hover:bg-#fce5c3">
                <span>{'Organization Name'}</span>
                <span>{'Number of Users'}</span>
                <span>{'Details'}</span>
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
