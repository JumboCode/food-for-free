import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

type SearchBarProps = {
    organizations: string[]
}

const SearchBar: React.FC<SearchBarProps> = ({ organizations }) => {
    const [searchInput, setSearchInput] = useState<string>('');
    const [filteredResults, setFilteredResults] = useState<string[]>([]);
    const [showDropdown, setShowDropDown] = useState<boolean>(false);

    // handle search input changes
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchInput(value);
    }

    // show dropdown when you click on it
    const handleFocus = () => {
        setShowDropDown(true);
    }

    // closes options when you click away
    const handleBlur = () => {
        setTimeout(() => {
            setShowDropDown(false);
        }, 200);
    }

    useEffect(() => {
        if (searchInput.trim() === '') {
            setFilteredResults(organizations);
        } else {
            const results = organizations.filter(org => 
                org.toLowerCase().includes(searchInput.toLowerCase())
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
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                {showDropdown && filteredResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                        {filteredResults.map((org, index) => (
                            <div 
                                key={index}
                                className={`px-4 py-3 hover:bg-gray-100 cursor-pointer text-gray-700 ${
                                    index !== filteredResults.length - 1 ? 'border-b border-gray-100' : ''
                                }`}
                            >
                                {org}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchBar;