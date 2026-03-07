'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { DayPicker, DateRange } from 'react-day-picker';
import { Calendar } from 'lucide-react';
import 'react-day-picker/dist/style.css'; // make sure this is imported once globally

interface MyCalendarProps {
    selectedRange?: { start: Date; end: Date };
    onRangeChange?: (range: { start: Date; end: Date }) => void;
}

export function MyCalendar({ selectedRange: externalRange, onRangeChange }: MyCalendarProps = {}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogId = useId();
    const [leftMonth, setLeftMonth] = useState<Date>(() =>
        externalRange ? new Date(externalRange.start) : new Date()
    );
    const [rightMonth, setRightMonth] = useState<Date>(() =>
        externalRange ? new Date(externalRange.end) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    );

    const initialRange: DateRange | undefined = externalRange
        ? { from: externalRange.start, to: externalRange.end }
        : undefined;

    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(initialRange);
    const [inputValue, setInputValue] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Sync internal state when external range changes (e.g., from quick filters)
    useEffect(() => {
        if (externalRange) {
            const newRange: DateRange = { from: externalRange.start, to: externalRange.end };
            setSelectedRange(newRange);
            setInputValue(
                `${format(externalRange.start, 'MM/dd/yyyy')} - ${format(externalRange.end, 'MM/dd/yyyy')}`
            );
            setLeftMonth(new Date(externalRange.start));
            setRightMonth(new Date(externalRange.end));
        }
    }, [externalRange]);

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

    const handleLeftSelect = (date: Date | undefined) => {
        if (!date) return;
        setSelectedRange(prev => {
            const from = date;
            const to = prev?.to && prev.to >= from ? prev.to : undefined;
            const next: DateRange = { from, to };
            if (to) {
                setInputValue(`${format(from, 'MM/dd/yyyy')} - ${format(to, 'MM/dd/yyyy')}`);
                setTimeout(() => onRangeChange?.({ start: from, end: to }), 0);
            } else {
                setInputValue(format(from, 'MM/dd/yyyy'));
            }
            return next;
        });
    };

    const handleRightSelect = (date: Date | undefined) => {
        if (!date) return;
        setSelectedRange(prev => {
            const to = date;
            const from = prev?.from && prev.from <= to ? prev.from : to;
            const next: DateRange = { from, to };
            setInputValue(`${format(from, 'MM/dd/yyyy')} - ${format(to, 'MM/dd/yyyy')}`);
            setTimeout(() => onRangeChange?.({ start: from, end: to }), 0);
            return next;
        });
    };

    const isInRange = (date: Date) => {
        if (!selectedRange?.from || !selectedRange?.to) return false;
        const t = date.getTime();
        return t >= selectedRange.from.getTime() && t <= selectedRange.to.getTime();
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
                setLeftMonth(from);
                setRightMonth(to);
                return;
            }
        } else if (parts.length === 1) {
            const from = parse(parts[0], 'MM/dd/yyyy', new Date());
            if (isValid(from)) {
                setSelectedRange({ from, to: undefined });
                setLeftMonth(from);
                return;
            }
        }

        setSelectedRange(undefined);
    };

    const handleClear = () => {
        setSelectedRange(undefined);
        setInputValue('');
        const now = new Date();
        setLeftMonth(now);
        setRightMonth(new Date(now.getFullYear(), now.getMonth() + 1, 1));
        if (onRangeChange) {
            onRangeChange({
                start: new Date('2025-01-01'),
                end: new Date('2025-12-31'),
            });
        }
    };

    const handleDone = () => toggleDialog();

    const themeAccent = '#FAC87D';
    const startMonth = new Date(new Date().getFullYear() - 10, 0);
    const endMonth = new Date(new Date().getFullYear() + 2, 11);

    return (
        <div className="flex flex-col items-end">
            <button
                onClick={toggleDialog}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-medium shadow-sm transition-colors border-[#FAC87D]/50 bg-[#FAC87D]/15 text-slate-800 hover:bg-[#FAC87D]/25 hover:border-[#FAC87D]/70"
                aria-controls={dialogId}
                aria-haspopup="dialog"
                aria-expanded={isDialogOpen}
            >
                <Calendar className="w-4 h-4 shrink-0" style={{ color: themeAccent }} />
                <span className="truncate max-w-[150px] sm:max-w-[220px]">
                    {selectedRange?.from && selectedRange?.to
                        ? `${format(selectedRange.from, 'MM/dd/yyyy')} - ${format(
                              selectedRange.to,
                              'MM/dd/yyyy'
                          )}`
                        : 'Select date range'}
                </span>
            </button>

            <dialog
                ref={dialogRef}
                id={dialogId}
                onClick={e => {
                    if (e.target === e.currentTarget) toggleDialog();
                }}
                className="p-0 border-0 bg-transparent backdrop:bg-black/30 w-full max-w-[min(95vw,44rem)] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
                <div className="calendar-picker-compact rounded-xl bg-white p-3 shadow-2xl sm:p-4 border border-slate-100">
                    <div className="mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Select date range
                        </p>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 text-center">
                                Start date
                            </p>
                            <DayPicker
                                mode="single"
                                month={leftMonth}
                                onMonthChange={setLeftMonth}
                                selected={selectedRange?.from}
                                onSelect={handleLeftSelect}
                                captionLayout="dropdown"
                                startMonth={startMonth}
                                endMonth={endMonth}
                                modifiers={{ inRange: isInRange }}
                                modifiersStyles={{
                                    inRange: { backgroundColor: '#fef8ed' },
                                }}
                                className="text-slate-900"
                            />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 text-center">
                                End date
                            </p>
                            <DayPicker
                                mode="single"
                                month={rightMonth}
                                onMonthChange={setRightMonth}
                                selected={selectedRange?.to}
                                onSelect={handleRightSelect}
                                captionLayout="dropdown"
                                startMonth={startMonth}
                                endMonth={endMonth}
                                modifiers={{ inRange: isInRange }}
                                modifiersStyles={{
                                    inRange: { backgroundColor: '#fef8ed' },
                                }}
                                className="text-slate-900"
                            />
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-slate-500">
                            {selectedRange?.from && selectedRange?.to ? (
                                <span>
                                    {format(selectedRange.from, 'MMM d, yyyy')} –{' '}
                                    {format(selectedRange.to, 'MMM d, yyyy')}
                                </span>
                            ) : (
                                <span>Pick a start and end date.</span>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleClear}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleDone}
                                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-black hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: themeAccent }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </dialog>
        </div>
    );
}
