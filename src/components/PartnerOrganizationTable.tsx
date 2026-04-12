'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import PartnerOrganizationRow, { PartnerDataRow } from '@/components/ui/PartnerOrganizationRow';

type NameSortDirection = 'asc' | 'desc';

const PartnerOrganizationTable: React.FC<{
    data: PartnerDataRow[];
    nameSort?: NameSortDirection;
    onNameSortChange?: (sort: NameSortDirection) => void;
}> = ({ data, nameSort = 'asc', onNameSortChange }) => {
    return (
        <div className="w-full min-w-[280px]">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)_56px] items-center gap-x-2 sm:gap-x-4 px-3 py-3 sm:px-6 bg-[#fafaf8] text-[10px] font-semibold text-gray-500 uppercase tracking-wide lg:text-xs">
                <div className="min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="lg:hidden">Org name</span>
                    <span className="hidden lg:inline">Organization name</span>
                    {onNameSortChange && (
                        <button
                            type="button"
                            onClick={() => onNameSortChange(nameSort === 'asc' ? 'desc' : 'asc')}
                            className="ml-0.5 inline-flex items-center gap-0.5 rounded-md border border-gray-200/80 bg-white px-1.5 py-0.5 normal-case shadow-sm transition-colors hover:bg-[#FFF6E8] hover:border-[#FAC87D]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC87D] focus-visible:ring-offset-1"
                            aria-label={
                                nameSort === 'asc'
                                    ? 'Sorted A to Z. Click to sort Z to A.'
                                    : 'Sorted Z to A. Click to sort A to Z.'
                            }
                        >
                            {nameSort === 'asc' ? (
                                <>
                                    <span className="text-[10px] font-bold text-gray-800 tabular-nums lg:text-[11px]">
                                        A
                                    </span>
                                    <span className="text-[9px] font-medium text-gray-400">→</span>
                                    <span className="text-[10px] font-bold text-gray-800 tabular-nums lg:text-[11px]">
                                        Z
                                    </span>
                                    <ChevronDown
                                        className="h-3.5 w-3.5 shrink-0 text-gray-500"
                                        strokeWidth={2.25}
                                        aria-hidden
                                    />
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] font-bold text-gray-800 tabular-nums lg:text-[11px]">
                                        Z
                                    </span>
                                    <span className="text-[9px] font-medium text-gray-400">→</span>
                                    <span className="text-[10px] font-bold text-gray-800 tabular-nums lg:text-[11px]">
                                        A
                                    </span>
                                    <ChevronUp
                                        className="h-3.5 w-3.5 shrink-0 text-gray-500"
                                        strokeWidth={2.25}
                                        aria-hidden
                                    />
                                </>
                            )}
                        </button>
                    )}
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
