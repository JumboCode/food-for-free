import React, { useState, useEffect } from 'react';
import { Search, ChevronRight } from 'lucide-react';

import PartnerCard from './PartnerCard';

type PartnerCardType = {
    id: number;
    name: string;
    location: string;
    type: string;
};

type SearchBarProps = {
    organizations: PartnerCardType[];
    onSelectPartner?: (partnerName: string) => void; // Add this
};

// TODO: customized specifically for partner cards ... may need to adjust for other types of cards
const SearchBarOverview: React.FC<SearchBarProps> = ({ organizations, onSelectPartner }) => {
    const [searchInput, setSearchInput] = useState<string>('');
    const [filteredResults, setFilteredResults] = useState<PartnerCardType[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

    // handle search input changes
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchInput(value);
    };

    // handle partner selection
    const handlePartnerSelect = (partnerName: string) => {
        if (onSelectPartner) {
            onSelectPartner(partnerName);
        }
        setIsDropdownOpen(false);
        setSearchInput('');
    };

    // handle input click to open dropdown
    const handleInputClick = () => {
        setIsDropdownOpen(true);
    };

    // close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.search-container')) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (searchInput.trim() === '') {
            setFilteredResults(organizations);
        } else {
            const results = organizations.filter(org =>
                org.name.toLowerCase().includes(searchInput.toLowerCase())
            );
            setFilteredResults(results);
        }
    }, [searchInput, organizations]);

    return (
        <div className="w-full max-w-lg mx-auto p-6">
            {/*search bar*/}
            <div className="relative search-container">
                <input
                    type="text"
                    placeholder="Search"
                    value={searchInput}
                    className="w-full px-4 py-3 pr-12 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onChange={handleSearchChange}
                    onClick={handleInputClick}
                />
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                {isDropdownOpen && filteredResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                        {filteredResults.map((org, index) => (
                            <div key={index}>
                                <PartnerCard
                                    key={org.id}
                                    id={org.id}
                                    name={org.name}
                                    location={org.location}
                                    type={org.type}
                                    disableClick={true}
                                    onSelect={handlePartnerSelect}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchBarOverview;
