'use client';

import React from 'react';

import PartnerOrganizationRow, { PartnerDataRow } from '@/components/ui/PartnerOrganizationRow';

const PartnerOrganizationTable: React.FC<{ data: PartnerDataRow[] }> = ({ data }) => {
    return (
        <div className="w-full min-w-[280px]">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)_56px] items-center gap-x-2 sm:gap-x-4 px-3 py-3 sm:px-6 bg-[#fafaf8] text-[10px] font-semibold text-gray-500 uppercase tracking-wide lg:text-xs">
                <div className="min-w-0">
                    <span className="lg:hidden">Org name</span>
                    <span className="hidden lg:inline">Organization name</span>
                </div>
                <div className="min-w-0 text-center">
                    <span className="lg:hidden"># of users</span>
                    <span className="hidden lg:inline">Number of users</span>
                </div>
                <div className="shrink-0 text-right">
                    <span className="lg:hidden">View</span>
                    <span className="hidden lg:inline">Details</span>
                </div>
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
