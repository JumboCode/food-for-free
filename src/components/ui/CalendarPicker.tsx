'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { DayPicker, DateRange } from 'react-day-picker';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-day-picker/dist/style.css'; // make sure this is imported once globally

export type CalendarTriggerVariant = 'pill' | 'panel' | 'responsive';
const MIN_FILTER_DATE = new Date(2025, 6, 1); // 07/01/2025 (local)

interface MyCalendarProps {
    selectedRange?: { start: Date; end: Date };
    onRangeChange?: (range: { start: Date; end: Date }) => void;
    /** Range applied when Reset is used. If omitted, defaults to the prior twelve months. */
    defaultRange?: { start: Date; end: Date };
    /** Called after Reset applies the default range, e.g. to sync preset controls in the parent. */
    onClear?: () => void;
    /**
     * `pill` — compact rounded control (may truncate). `panel` — full-width block, two-line dates.
     * `responsive` — panel below `lg`, pill from `lg` up (overview toolbar).
     */
    triggerVariant?: CalendarTriggerVariant;
}

function getPast12MonthsRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 12);
    start.setDate(start.getDate() + 1);
    return { start, end };
}

export function MyCalendar({
    selectedRange: externalRange,
    onRangeChange,
    defaultRange,
    onClear,
    triggerVariant = 'pill',
}: MyCalendarProps = {}) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const normalizeMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
    const isResponsive = triggerVariant === 'responsive';
    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogId = useId();
    const [leftMonth, setLeftMonth] = useState<Date>(() =>
        externalRange ? new Date(externalRange.start) : new Date()
    );
    const [rightMonth, setRightMonth] = useState<Date>(() =>
        externalRange
            ? new Date(externalRange.end)
            : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
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
            setLeftMonth(normalizeMonth(new Date(externalRange.start)));
            setRightMonth(normalizeMonth(new Date(externalRange.end)));
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
        if (date > todayStart) return;
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
        if (date > todayStart) return;
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
                setLeftMonth(normalizeMonth(from));
                setRightMonth(normalizeMonth(to));
                return;
            }
        } else if (parts.length === 1) {
            const from = parse(parts[0], 'MM/dd/yyyy', new Date());
            if (isValid(from)) {
                setSelectedRange({ from, to: undefined });
                setLeftMonth(normalizeMonth(from));
                return;
            }
        }

        setSelectedRange(undefined);
    };

    const handleClear = () => {
        const range = defaultRange ?? getPast12MonthsRange();
        setSelectedRange({ from: range.start, to: range.end });
        setInputValue(`${format(range.start, 'MM/dd/yyyy')} - ${format(range.end, 'MM/dd/yyyy')}`);
        setLeftMonth(normalizeMonth(range.start));
        setRightMonth(normalizeMonth(range.end));
        onRangeChange?.(range);
        onClear?.();
    };

    const handleDone = () => toggleDialog();

    const themeAccent = '#FAC87D';
    const startMonth = new Date(MIN_FILTER_DATE.getFullYear(), MIN_FILTER_DATE.getMonth(), 1);
    const endMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const rangeTitle =
        selectedRange?.from && selectedRange?.to
            ? `${format(selectedRange.from, 'MMMM d, yyyy')} – ${format(selectedRange.to, 'MMMM d, yyyy')}`
            : undefined;

    return (
        <div
            className={cn(
                'flex min-w-0 max-w-full flex-col',
                triggerVariant === 'panel' && 'items-stretch',
                triggerVariant === 'pill' && 'items-stretch sm:items-end',
                isResponsive && 'items-stretch lg:items-end'
            )}
        >
            <button
                type="button"
                onClick={toggleDialog}
                title={rangeTitle}
                className={cn(
                    'flex min-w-0 max-w-full items-center gap-2 border text-left font-medium shadow-sm transition-colors border-[#FAC87D]/50 bg-[#FAC87D]/15 text-slate-800 hover:bg-[#FAC87D]/25 hover:border-[#FAC87D]/70',
                    triggerVariant === 'panel' && 'w-full rounded-lg px-3 py-2.5 text-sm',
                    triggerVariant === 'pill' &&
                        'inline-flex rounded-full px-3 py-1.5 text-xs sm:max-w-[min(100%,20rem)] sm:text-sm',
                    isResponsive &&
                        'w-full rounded-lg px-3 py-2.5 text-sm lg:inline-flex lg:w-auto lg:max-w-[min(100%,20rem)] lg:rounded-full lg:px-3 lg:py-1.5 lg:text-xs xl:text-sm'
                )}
                aria-controls={dialogId}
                aria-haspopup="dialog"
                aria-expanded={isDialogOpen}
            >
                <Calendar className="h-4 w-4 shrink-0" style={{ color: themeAccent }} />
                {isResponsive && selectedRange?.from && selectedRange?.to ? (
                    <>
                        <div className="min-w-0 flex-1 leading-snug lg:hidden">
                            <span className="block font-medium tabular-nums text-slate-900">
                                {format(selectedRange.from, 'MMM d, yyyy')}
                            </span>
                            <span className="mt-0.5 block text-xs font-normal tabular-nums text-slate-600">
                                through {format(selectedRange.to, 'MMM d, yyyy')}
                            </span>
                        </div>
                        <span className="hidden min-w-0 flex-1 truncate lg:block">
                            {`${format(selectedRange.from, 'MM/dd/yyyy')} - ${format(
                                selectedRange.to,
                                'MM/dd/yyyy'
                            )}`}
                        </span>
                    </>
                ) : triggerVariant === 'panel' && selectedRange?.from && selectedRange?.to ? (
                    <div className="min-w-0 flex-1 leading-snug">
                        <span className="block font-medium tabular-nums text-slate-900">
                            {format(selectedRange.from, 'MMM d, yyyy')}
                        </span>
                        <span className="mt-0.5 block text-xs font-normal tabular-nums text-slate-600">
                            through {format(selectedRange.to, 'MMM d, yyyy')}
                        </span>
                    </div>
                ) : (
                    <span
                        className={cn(
                            'min-w-0 flex-1',
                            triggerVariant === 'panel' && 'text-sm text-slate-600',
                            triggerVariant === 'pill' && 'truncate',
                            isResponsive &&
                                'text-sm text-slate-600 lg:truncate lg:text-xs xl:text-sm'
                        )}
                    >
                        {selectedRange?.from && selectedRange?.to
                            ? `${format(selectedRange.from, 'MM/dd/yyyy')} - ${format(
                                  selectedRange.to,
                                  'MM/dd/yyyy'
                              )}`
                            : 'Specify dates'}
                    </span>
                )}
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
                            Custom date range
                        </p>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 text-center">
                                Period start
                            </p>
                            <DayPicker
                                mode="single"
                                month={leftMonth}
                                onMonthChange={month => setLeftMonth(normalizeMonth(month))}
                                selected={selectedRange?.from}
                                onSelect={handleLeftSelect}
                                captionLayout="dropdown"
                                startMonth={startMonth}
                                endMonth={endMonth}
                                disabled={{ before: MIN_FILTER_DATE, after: todayStart }}
                                modifiers={{ inRange: isInRange }}
                                modifiersStyles={{
                                    inRange: { backgroundColor: '#fef8ed' },
                                }}
                                className="text-slate-900"
                            />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 text-center">
                                Period end
                            </p>
                            <DayPicker
                                mode="single"
                                month={rightMonth}
                                onMonthChange={month => setRightMonth(normalizeMonth(month))}
                                selected={selectedRange?.to}
                                onSelect={handleRightSelect}
                                captionLayout="dropdown"
                                startMonth={startMonth}
                                endMonth={endMonth}
                                disabled={{ before: MIN_FILTER_DATE, after: todayStart }}
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
                                <span>Select a period start and end date.</span>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={handleDone}
                                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-black hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: themeAccent }}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            </dialog>
        </div>
    );
}
