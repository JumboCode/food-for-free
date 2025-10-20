'use client';

import { useState } from 'react';

type DropdownProps = {
  label?: string;
  options: string[];
  onSelect: (selected: string | string[]) => void;
  mode?: 'single' | 'multiple';
  placeholder?: string;
};

function DropdownMenu({ label, options, onSelect, mode = 'single', placeholder = 'Select' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [singleValue, setSingleValue] = useState<string>('');
  const [multiValues, setMultiValues] = useState<Set<string>>(new Set());

  const toggleOpen = () => setOpen(v => !v);

  const handleSingle = (option: string) => {
    setSingleValue(option);
    onSelect(option);
    setOpen(false);
  };

  const handleToggleMulti = (option: string) => {
    const next = new Set(multiValues);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    setMultiValues(next);
    onSelect(Array.from(next));
  };

  const selectedLabel = mode === 'single'
    ? (singleValue || placeholder)
    : (multiValues.size > 0 ? Array.from(multiValues).join(', ') : placeholder);

  return (
    <div className="relative inline-block text-left">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div>
        <button
          type="button"
          className="inline-flex justify-between items-center w-64 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm shadow-sm hover:bg-gray-50"
          onClick={toggleOpen}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <span className="truncate">{selectedLabel}</span>
          <svg className="ml-2 h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-10 mt-2 w-64 rounded-md bg-white shadow-lg border border-gray-200">
          <ul className="max-h-60 overflow-auto p-2" role="menu" aria-orientation="vertical" aria-labelledby="options">
            {options.map((opt) => (
              <li key={opt} className="p-1">
                {mode === 'single' ? (
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 ${singleValue === opt ? 'bg-gray-100 font-medium' : ''}`}
                    onClick={() => handleSingle(opt)}
                  >
                    {opt}
                  </button>
                ) : (
                  <label className="flex items-center w-full px-2 py-1 cursor-pointer rounded-md hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={multiValues.has(opt)}
                      onChange={() => handleToggleMulti(opt)}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                )}
              </li>
            ))}
            <li className="p-2">
              <div className="flex justify-between text-xs text-gray-500">
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    // Clear selection
                    setSingleValue('');
                    setMultiValues(new Set());
                    onSelect(mode === 'single' ? '' : []);
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="ml-2"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  const [singleSelection, setSingleSelection] = useState<string>('');
  const [multipleSelection, setMultipleSelection] = useState<string[]>([]);

  const fruitOptions = ['Apple', 'Banana', 'Orange', 'Grape', 'Mango'];
  const colorOptions = ['Red', 'Blue', 'Green', 'Yellow', 'Purple'];

  const handleSingleSelect = (selected: string | string[]) => {
    setSingleSelection(selected as string);
    console.log('Single selection:', selected);
  };

  const handleMultipleSelect = (selected: string | string[]) => {
    setMultipleSelection(selected as string[]);
    console.log('Multiple selection:', selected);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Dropdown Menu Test Page
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Single Selection Mode
          </h2>
          <DropdownMenu
            label="Choose a Fruit"
            options={fruitOptions}
            onSelect={handleSingleSelect}
            mode="single"
            placeholder="Select a fruit"
          />
          {singleSelection && (
            <p className="mt-4 text-sm text-gray-600">
              Selected: <span className="font-medium">{singleSelection}</span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Multiple Selection Mode
          </h2>
          <DropdownMenu
            label="Choose Colors"
            options={colorOptions}
            onSelect={handleMultipleSelect}
            mode="multiple"
            placeholder="Select colors"
          />
          {multipleSelection.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Selected: <span className="font-medium">{multipleSelection.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}