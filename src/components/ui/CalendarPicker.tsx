'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css'; // make sure this is imported once globally

interface MyCalendarProps {
    selectedRange?: { start: Date; end: Date };
    onRangeChange?: (range: { start: Date; end: Date }) => void;
}

export function MyCalendar({ selectedRange: externalRange, onRangeChange }: MyCalendarProps = {}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogId = useId();
    const [month, setMonth] = useState(new Date());

    // Convert external range format to DateRange format
    const initialRange: DateRange | undefined = externalRange
        ? { from: externalRange.start, to: externalRange.end }
        : undefined;

    const [selectedRange, setSelectedRange] = useState<DateRange>(initialRange);
    const [inputValue, setInputValue] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const toggleDialog = () => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (isDialogOpen) {
            dialog.close();
            setIsDialogOpen(false);
        } else {
            dialog.showModal();
            setIsDialogOpen(true);
        }
    };

    // lock scroll when dialog open
    useEffect(() => {
        document.body.style.overflow = isDialogOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isDialogOpen]);

    const handleDayPickerSelect = (range: DateRange | undefined) => {
        setSelectedRange(range);
        if (range?.from && range?.to) {
            setInputValue(
                `${format(range.from, 'MM/dd/yyyy')} - ${format(range.to, 'MM/dd/yyyy')}`
            );
            // Notify parent component if callback is provided
            if (onRangeChange) {
                onRangeChange({ start: range.from, end: range.to });
            }
        } else if (range?.from) setInputValue(format(range.from, 'MM/dd/yyyy'));
        else setInputValue('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const str = e.target.value;
        setInputValue(str); // Keep the input value in sync

        const parts = str.split(' - ');
        if (parts.length === 2) {
            // Check for a full range
            const from = parse(parts[0], 'MM/dd/yyyy', new Date());
            const to = parse(parts[1], 'MM/dd/yyyy', new Date());
            if (isValid(from) && isValid(to)) {
                setSelectedRange({ from, to });
                setMonth(from); // Update calendar view
                return;
            }
        } else if (parts.length === 1) {
            // Check for a single date (start of range)
            const from = parse(parts[0], 'MM/dd/yyyy', new Date());
            if (isValid(from)) {
                setSelectedRange({ from, to: undefined });
                setMonth(from); // Update calendar view
                return;
            }
        }

        // If parsing fails or input is empty/invalid, clear the selection
        setSelectedRange(undefined);
    };

    const handleClear = () => {
        setSelectedRange(undefined);
        setInputValue('');
        // Notify parent component to reset to default range
        if (onRangeChange) {
            onRangeChange({
                start: new Date('2025-01-01'),
                end: new Date('2025-12-31'),
            });
        }
    };

    const handleDone = () => toggleDialog();

    return (
        <div className="flex flex-col items-center">
            {/* <label htmlFor="date-input" className="text-lg mb-2 font-semibold">
                Date Range:
            </label>

            <input
                id="date-input"
                type="text"
                value={inputValue}
                placeholder="MM/dd/yyyy - MM/dd/yyyy"
                onChange={handleInputChange}
                className="text-lg px-4 py-2 mb-2 w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-center"
            /> */}

            <button
                onClick={toggleDialog}
                className="px-4 py-2 bg-[#A7C7E7] hover:bg-[#8FB5D9] text-white rounded-lg flex items-center gap-2 font-medium"
                aria-controls={dialogId}
                aria-haspopup="dialog"
                aria-expanded={isDialogOpen}
            >
                Date Range 📅
            </button>

            {/* <p className="text-base mb-4 text-gray-700">
                {selectedRange?.from && selectedRange?.to
                    ? `${selectedRange.from.toDateString()} - ${selectedRange.to.toDateString()}`
                    : 'Please pick a date range'}
            </p> */}

            <dialog
                ref={dialogRef}
                id={dialogId}
                onClick={e => {
                    if (e.target === e.currentTarget) toggleDialog();
                }}
                className="p-6 rounded-xl shadow-2xl border-0 bg-white backdrop:bg-black/30 w-fit fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
                <DayPicker
                    month={month}
                    onMonthChange={setMonth}
                    mode="range"
                    selected={selectedRange}
                    onSelect={handleDayPickerSelect}
                    className="text-gray-800"
                />

                <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={handleClear}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-md"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleDone}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md"
                    >
                        Done
                    </button>
                </div>
            </dialog>
        </div>
    );
}
