'use client';

import React, { useRef, useState } from 'react';

import OrganizationUserRow, { UserDataRow } from '@/components/ui/OrganizationUserRow';

const PartnerOrganizationRow: React.FC<{ data: UserDataRow[] }> = ({ data }) => {
    return (
        <div>
            <div className="flex items-center justify-between gap-4 p-4 bg-#e5f3ea rounded-lg mb-2 cursor-pointer hover:bg-#fce5c3">
                <span>{'User'}</span>
                <span>{'Email'}</span>
                <span>{'Status'}</span>
                <span>{'Actions'}</span>
            </div>
            {data.map(user => (
                <PartnerOrganizationRow
                    key={user.id}
                    name={user.name}
                    email={user.email}
                    status={user.status}
                    onClick={user.onClick}
                />
            ))}
        </div>
    );
};

export default PartnerOrganizationTable;
