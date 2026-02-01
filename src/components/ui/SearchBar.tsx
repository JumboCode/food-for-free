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
};

// TODO: customized specifically for partner cards ... may need to adjust for other types of cards
const SearchBar: React.FC<SearchBarProps> = ({ organizations }) => {
    const [searchInput, setSearchInput] = useState<string>('');
    const [filteredResults, setFilteredResults] = useState<PartnerCardType[]>([]);

    // handle search input changes
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchInput(value);
    };

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
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search"
                    value={searchInput}
                    className="w-full px-4 py-3 pr-12 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onChange={handleSearchChange}
                />
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredResults.map((org, index) => (
                        <div key={index}>
                            <PartnerCard
                                key={org.id}
                                id={org.id}
                                name={org.name}
                                location={org.location}
                                type={org.type}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SearchBar;
