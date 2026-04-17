import React, { useState, useEffect, useId } from 'react';
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
    wrapperClassName?: string;
    /** Visible label above the field (helps distinguish from other search boxes). */
    label?: string;
    placeholder?: string;
};

const SearchBarOverview: React.FC<SearchBarProps> = ({
    organizations,
    onSelectPartner,
    wrapperClassName,
    label,
    placeholder = 'Search organizations',
}) => {
    const inputId = useId();
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
        <div className={wrapperClassName ?? 'w-full max-w-[17.5rem] sm:max-w-sm'}>
            {isAdmin && (
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
                            value={searchInput}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#B7D7BD] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD]"
                            onChange={handleSearchChange}
                            onClick={handleInputClick}
                            onFocus={handleInputClick}
                            aria-label={label ? undefined : placeholder}
                            autoComplete="off"
                        />
                    </div>
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
