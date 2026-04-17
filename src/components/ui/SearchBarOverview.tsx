import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

import PartnerCard from './PartnerCard';

type PartnerCardType = {
    id: number;
    name: string;
    householdId18?: string | null;
    location: string;
    type: string;
};

type SearchBarProps = {
    organizations: PartnerCardType[];
    onSelectPartner?: (partner: { name: string; householdId18?: string | null }) => void;
};

const SearchBarOverview: React.FC<SearchBarProps> = ({ organizations, onSelectPartner }) => {
    const [searchInput, setSearchInput] = useState<string>('');
    const [filteredResults, setFilteredResults] = useState<PartnerCardType[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        fetch('/api/admin/check')
            .then(res => res.json())
            .then(data => setIsAdmin(data.isAdmin || false))
            .catch(() => setIsAdmin(false));
    }, []);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.target.value);
    };

    const handlePartnerSelect = (partner: { name: string; householdId18?: string | null }) => {
        onSelectPartner?.(partner);
        setIsDropdownOpen(false);
        setSearchInput('');
    };

    const handleInputClick = () => {
        if (isAdmin) setIsDropdownOpen(true);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.search-container')) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const raw =
            searchInput.trim() === ''
                ? organizations
                : organizations.filter(org =>
                      org.name.toLowerCase().includes(searchInput.toLowerCase())
                  );
        const sorted = [...raw].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
        );
        setFilteredResults(sorted);
    }, [searchInput, organizations]);

    return (
        <div className="w-full max-w-[17.5rem] sm:max-w-sm">
            {isAdmin && (
                <div className="search-container relative w-full">
                    <input
                        type="text"
                        placeholder="Search organizations"
                        value={searchInput}
                        className="w-full rounded-md border border-gray-400/70 bg-white py-2 pl-3 pr-9 text-sm text-gray-700 shadow-sm ring-1 ring-black/[0.03] placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1C5E2C]/40"
                        onChange={handleSearchChange}
                        onClick={handleInputClick}
                        onFocus={handleInputClick}
                        aria-label="Search organizations"
                        autoComplete="off"
                    />
                    <Search
                        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                        aria-hidden
                    />
                    {isDropdownOpen && filteredResults.length > 0 && (
                        <div
                            className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 divide-y divide-stone-200/90 overflow-y-auto rounded-md border border-stone-300/80 bg-[#FAF9F7] shadow-lg ring-1 ring-stone-900/5"
                            role="listbox"
                            aria-label="Organization results"
                        >
                            {filteredResults.map(org => (
                                <PartnerCard
                                    key={org.id}
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
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBarOverview;
