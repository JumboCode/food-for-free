'use client';

import { MyCalendar } from '@/components/ui/CalendarPicker';
import { useFilterContext } from '@/contexts/FilterContext';

const THEME_ORANGE = '#FAC87D';

type QuickFilter =
    | 'last30days'
    | 'thisMonth'
    | 'thisYear'
    | 'fiscalYearToDate'
    | 'past12months'
    | 'allTime';

const FILTER_OPTIONS: { key: QuickFilter; label: string; title: string }[] = [
    {
        key: 'last30days',
        label: 'Last 30 days',
        title: 'Thirty consecutive calendar days, inclusive of today',
    },
    {
        key: 'thisMonth',
        label: 'Month to date',
        title: 'From the first day of the current calendar month through today',
    },
    {
        key: 'thisYear',
        label: 'Full calendar year',
        title: 'January 1 through December 31 of the current calendar year',
    },
    {
        key: 'fiscalYearToDate',
        label: 'Fiscal year',
        title: 'From July 1 through today. Fiscal year is July 1–June 30.',
    },
    { key: 'past12months', label: 'Past 12 months', title: 'Twelve months ending today (rolling)' },
    { key: 'allTime', label: 'All Time', title: 'All delivery records on file' },
];

export default function FilterBar() {
    const { activeFilter, dateRange, setQuickFilter, handleDateRangeChange, getLast30DaysRange } =
        useFilterContext();

    return (
        <div className="min-w-0 rounded-lg border border-gray-300/90 bg-white px-3 py-2 shadow-sm ring-1 ring-black/[0.03] sm:px-4 sm:py-2.5">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-4 lg:gap-y-2">
                <div className="min-w-0 lg:flex-1">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                        Time Range
                    </p>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="hidden text-xs font-semibold uppercase tracking-wide text-gray-500 lg:mr-1 lg:inline">
                            Time Range
                        </span>
                        {FILTER_OPTIONS.map(({ key, label, title }) => (
                            <button
                                key={key}
                                type="button"
                                title={title}
                                onClick={() => setQuickFilter(key)}
                                className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                    activeFilter === key
                                        ? 'text-gray-900 border-transparent'
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                }`}
                                style={
                                    activeFilter === key
                                        ? { backgroundColor: THEME_ORANGE }
                                        : undefined
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="min-w-0 w-full lg:flex lg:w-auto lg:shrink-0 lg:justify-end">
                    <MyCalendar
                        triggerVariant="responsive"
                        selectedRange={dateRange}
                        onRangeChange={handleDateRangeChange}
                        defaultRange={getLast30DaysRange()}
                        onClear={() => setQuickFilter('last30days')}
                    />
                </div>
            </div>
        </div>
    );
}
