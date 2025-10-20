'use client';

import { useState, useRef, useEffect } from 'react';

interface DropdownMenuProps {
  label: string;
  options: string[];
  onSelect: (selected: string | string[]) => void;
  mode?: 'single' | 'multiple';
  placeholder?: string;
}

export default function DropdownMenu({
  label,
  options,
  onSelect,
  mode = 'single',
  placeholder = 'Select Option'
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: string) => {
    if (mode === 'single') {
      setSelectedItems([option]);
      onSelect(option);
      setIsOpen(false);
    } else {
      const newSelection = selectedItems.includes(option)
        ? selectedItems.filter(item => item !== option)
        : [...selectedItems, option];
      setSelectedItems(newSelection);
    }
  };

  const handleApply = () => {
    if (mode === 'multiple') {
      onSelect(selectedItems);
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    if (selectedItems.length === 0) return placeholder;
    if (mode === 'single') return selectedItems[0];
    return `${selectedItems.length} selected`;
  };

  return (
    <div className="w-64" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="relative">
        <button
          onClick={handleToggle}
          className="w-full px-4 py-2 text-left bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-between transition-colors"
        >
          <span className="text-gray-700">{getDisplayText()}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="py-2">
              <div className="px-4 py-2 text-sm text-gray-500">
                {placeholder}
              </div>
              {options.map((option, index) => (
                <div
                  key={index}
                  onClick={() => handleOptionClick(option)}
                  className={`px-4 py-2 cursor-pointer transition-colors ${
                    selectedItems.includes(option)
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    {mode === 'multiple' && (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(option)}
                        onChange={() => {}}
                        className="mr-2"
                      />
                    )}
                    {option}
                  </div>
                </div>
              ))}
              {mode === 'multiple' && (
                <div className="px-4 py-2 border-t mt-2">
                  <button
                    onClick={handleApply}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}