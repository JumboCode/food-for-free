import React, { useState, useEffect, useId, useMemo } from 'react';
import { Search, X } from 'lucide-react';

import PartnerCard from './PartnerCard';
import type { PartnerOrgCard } from '@/types/partner';

type SearchBarProps = {
    organizations: PartnerOrgCard[];
    onSelectPartner?: (partner: { name: string; householdId18?: string | null }) => void;
    selectedPartner?: { name: string; householdId18?: string | null } | null;
    selectedPartners?: { name: string; householdId18?: string | null }[];
    onTogglePartner?: (partner: { name: string; householdId18?: string | null }) => void;
    onClearAllPartners?: () => void;
    showSelectedChips?: boolean;
    onClearPartner?: () => void;
    wrapperClassName?: string;
    /** Visible label above the field (helps distinguish from other search boxes). */
    label?: string;
    placeholder?: string;
};

const SearchBarOverview: React.FC<SearchBarProps> = ({
    organizations,
    onSelectPartner,
    selectedPartner,
    selectedPartners,
    onTogglePartner,
    onClearAllPartners,
    onClearPartner,
    wrapperClassName,
    label,
    placeholder = 'Search organizations',
    showSelectedChips = true,
}) => {
    const inputId = useId();
    const [searchInput, setSearchInput] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.target.value);
    };
    const selectedKeys = useMemo(() => {
        const selectedList = selectedPartners ?? (selectedPartner ? [selectedPartner] : []);
        return new Set(
            selectedList.map(p =>
                p.householdId18?.trim()
                    ? `id:${p.householdId18.trim()}`
                    : `name:${p.name.trim().toLowerCase()}`
            )
        );
    }, [selectedPartner, selectedPartners]);
    const displayValue = searchInput || (selectedPartners ? '' : selectedPartner?.name || '');

    const handlePartnerSelect = (partner: { name: string; householdId18?: string | null }) => {
        if (onTogglePartner) {
            onTogglePartner(partner);
        } else {
            onSelectPartner?.(partner);
            setIsDropdownOpen(false);
            setSearchInput('');
        }
    };

    const handleInputClick = () => {
        setIsDropdownOpen(true);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.search-container')) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredResults = useMemo(() => {
        const raw =
            searchInput.trim() === ''
                ? organizations
                : organizations.filter(org =>
                      org.name.toLowerCase().includes(searchInput.toLowerCase())
                  );
        return [...raw].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
        );
    }, [searchInput, organizations]);

    return (
        <div className={wrapperClassName ?? 'w-full max-w-[17.5rem] sm:max-w-sm'}>
            <div className="search-container relative w-full">
                {label ? (
                    <label
                        htmlFor={inputId}
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        {label}
                    </label>
                ) : null}
                <div className="relative w-full">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
                        aria-hidden
                    />
                    <input
                        id={inputId}
                        type="text"
                        placeholder={placeholder}
                        value={displayValue}
                        className="h-10 w-full truncate rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-10 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#B7D7BD] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD]"
                        onChange={handleSearchChange}
                        onClick={handleInputClick}
                        onFocus={handleInputClick}
                        aria-label={label ? undefined : placeholder}
                        title={selectedPartner?.name ?? undefined}
                        autoComplete="off"
                    />
                    {selectedPartners ? (
                        selectedPartners.length > 0 ? (
                            <button
                                type="button"
                                className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Clear organization filters"
                                onClick={e => {
                                    e.stopPropagation();
                                    setSearchInput('');
                                    onClearAllPartners?.();
                                    setIsDropdownOpen(false);
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        ) : null
                    ) : selectedPartner ? (
                        <button
                            type="button"
                            className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Clear organization filter"
                            onClick={e => {
                                e.stopPropagation();
                                setSearchInput('');
                                onClearPartner?.();
                                setIsDropdownOpen(false);
                            }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    ) : null}
                </div>
                {isDropdownOpen && filteredResults.length > 0 && (
                    <div
                        className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 divide-y divide-stone-200/90 overflow-y-auto rounded-md border border-stone-300/80 bg-[#FAF9F7] shadow-lg ring-1 ring-stone-900/5"
                        role="listbox"
                        aria-label="Organization results"
                    >
                        {filteredResults.map(org => {
                            const k = org.householdId18?.trim()
                                ? `id:${org.householdId18.trim()}`
                                : `name:${org.name.trim().toLowerCase()}`;
                            const checked = selectedKeys.has(k);
                            if (selectedPartners) {
                                return (
                                    <button
                                        key={org.id}
                                        type="button"
                                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#F3F0EA]"
                                        onClick={() =>
                                            handlePartnerSelect({
                                                name: org.name,
                                                householdId18: org.householdId18,
                                            })
                                        }
                                    >
                                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                                            {org.name}
                                        </span>
                                        <span
                                            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                                                checked
                                                    ? 'border-[#1C5E2C] bg-[#e8f4eb] text-[#1C5E2C]'
                                                    : 'border-gray-300 text-transparent'
                                            }`}
                                            aria-hidden="true"
                                        >
                                            ✓
                                        </span>
                                    </button>
                                );
                            }
                            return (
                                <div
                                    key={org.id}
                                    className="flex items-center justify-between gap-2 px-2"
                                >
                                    <PartnerCard
                                        compact
                                        surface="neutral"
                                        id={org.id}
                                        name={org.name}
                                        householdId18={org.householdId18}
                                        location={org.location}
                                        type={org.type}
                                        disableClick={true}
                                        onSelect={handlePartnerSelect}
                                    />
                                    {null}
                                </div>
                            );
                        })}
                    </div>
                )}
                {showSelectedChips && selectedPartners && selectedPartners.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedPartners.map(p => {
                            const key = p.householdId18?.trim()
                                ? `id:${p.householdId18.trim()}`
                                : `name:${p.name.trim().toLowerCase()}`;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-full bg-[#e8f4eb] px-2 py-1 text-xs text-[#1C5E2C]"
                                    onClick={() => onTogglePartner?.(p)}
                                >
                                    <span className="max-w-44 truncate">{p.name}</span>
                                    <X className="h-3 w-3" />
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default SearchBarOverview;
