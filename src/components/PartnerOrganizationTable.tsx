'use client';

import React from 'react';
import { ChevronDown, ChevronUp, SortAsc, SortDesc } from 'lucide-react';

import PartnerOrganizationRow, { PartnerDataRow } from '@/components/ui/PartnerOrganizationRow';

type NameSortDirection = 'asc' | 'desc';

const iconSm = 'h-4 w-4 shrink-0 text-gray-600';

/** Typical asc/desc “lines + arrow” glyphs — compact */
const sortDirIcon = 'h-4 w-4 shrink-0 text-gray-600';

const sortChipBase =
    'ml-0.5 inline-flex items-center justify-center gap-0.5 rounded-md border px-1.5 py-0.5 normal-case shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';

function sortChipClass(active: boolean): string {
    return active
        ? `${sortChipBase} border-gray-200/80 bg-white hover:bg-[#FFF6E8] hover:border-[#FAC87D]/60 focus-visible:ring-[#FAC87D]`
        : `${sortChipBase} border-gray-200/70 bg-white/90 opacity-[0.72] hover:opacity-100 hover:bg-gray-50/95 hover:border-gray-200 focus-visible:ring-gray-300`;
}

const PartnerOrganizationTable: React.FC<{
    data: PartnerDataRow[];
    nameSort?: NameSortDirection;
    nameSortActive?: boolean;
    onNameSortToggle?: () => void;
    usersSort?: NameSortDirection;
    usersSortActive?: boolean;
    onUsersSortToggle?: () => void;
}> = ({
    data,
    nameSort = 'asc',
    nameSortActive = true,
    onNameSortToggle,
    usersSort = 'asc',
    usersSortActive = false,
    onUsersSortToggle,
}) => {
    return (
        <div className="w-full min-w-[280px]">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.15fr)_56px] items-center gap-x-2 sm:gap-x-4 px-3 py-3 sm:px-6 bg-[#fafaf8] text-[10px] font-semibold text-gray-500 uppercase tracking-wide lg:text-xs">
                <div className="min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="lg:hidden">Org name</span>
                    <span className="hidden lg:inline">Organization name</span>
                    {onNameSortToggle && (
                        <button
                            type="button"
                            onClick={onNameSortToggle}
                            className={sortChipClass(nameSortActive)}
                            aria-label={
                                nameSort === 'asc'
                                    ? 'Sorted A to Z. Click to sort Z to A.'
                                    : 'Sorted Z to A. Click to sort A to Z.'
                            }
                            aria-pressed={nameSortActive}
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
                                        className={`${iconSm} text-gray-500`}
                                        strokeWidth={2}
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
                                        className={`${iconSm} text-gray-500`}
                                        strokeWidth={2}
                                        aria-hidden
                                    />
                                </>
                            )}
                        </button>
                    )}
                </div>
                <div className="min-w-0 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center">
                    <span className="lg:hidden"># of users</span>
                    <span className="hidden lg:inline">Number of users</span>
                    {onUsersSortToggle && (
                        <button
                            type="button"
                            onClick={onUsersSortToggle}
                            className={`${sortChipClass(usersSortActive)} px-1 py-0.5 sm:px-1.5`}
                            aria-label={
                                usersSort === 'asc'
                                    ? 'Sorted low to high by user count. Click to sort high to low.'
                                    : 'Sorted high to low by user count. Click to sort low to high.'
                            }
                            aria-pressed={usersSortActive}
                        >
                            {usersSort === 'asc' ? (
                                <SortAsc className={sortDirIcon} strokeWidth={2} aria-hidden />
                            ) : (
                                <SortDesc className={sortDirIcon} strokeWidth={2} aria-hidden />
                            )}
                        </button>
                    )}
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
