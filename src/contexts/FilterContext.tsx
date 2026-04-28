'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type QuickFilter =
    | 'last30days'
    | 'thisMonth'
    | 'thisYear'
    | 'fiscalYearToDate'
    | 'past12months'
    | 'allTime';

export interface DateRange {
    start: Date;
    end: Date;
}
// Earliest selectable date for quick filters / manual ranges.
// Current reporting baseline starts at the FY window beginning July 1, 2025.
const MIN_FILTER_DATE = new Date(2025, 6, 1); // 07/01/2025 (local)

interface FilterContextValue {
    activeFilter: QuickFilter | null;
    dateRange: DateRange;
    setActiveFilter: (filter: QuickFilter | null) => void;
    handleDateRangeChange: (range: DateRange) => void;
    setQuickFilter: (filter: QuickFilter) => void;
    getLast30DaysRange: () => DateRange;
}

export function getLast30DaysRange(): DateRange {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { start, end };
}

function startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function clampRangeToToday(range: DateRange): DateRange {
    const today = startOfToday();
    const endToToday = range.end > today ? today : range.end;
    const end = endToToday < MIN_FILTER_DATE ? MIN_FILTER_DATE : endToToday;
    const startToToday = range.start > today ? today : range.start;
    const start = startToToday < MIN_FILTER_DATE ? MIN_FILTER_DATE : startToToday;
    if (start > end) return { start: end, end };
    return { start, end };
}

function getFiscalYearToDateRange(now: Date): DateRange {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const y = today.getFullYear();
    const fiscalStartYear = today.getMonth() >= 6 ? y : y - 1;
    return { start: new Date(fiscalStartYear, 6, 1), end: today };
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
    const [dateRange, setDateRange] = useState<DateRange>(getLast30DaysRange);
    const [activeFilter, setActiveFilter] = useState<QuickFilter | null>('last30days');

    const handleDateRangeChange = (range: DateRange) => {
        setDateRange(clampRangeToToday(range));
        setActiveFilter(null);
    };

    const setQuickFilter = (filter: QuickFilter) => {
        setActiveFilter(filter);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filter) {
            case 'last30days': {
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
                setDateRange(clampRangeToToday({ start: thirtyDaysAgo, end: today }));
                break;
            }
            case 'thisMonth':
                setDateRange(
                    clampRangeToToday({
                        start: new Date(currentYear, currentMonth, 1),
                        end: today,
                    })
                );
                break;
            case 'thisYear':
                setDateRange(
                    clampRangeToToday({
                        start: new Date(currentYear, 0, 1),
                        end: today,
                    })
                );
                break;
            case 'fiscalYearToDate':
                setDateRange(clampRangeToToday(getFiscalYearToDateRange(now)));
                break;
            case 'past12months': {
                const start = new Date(today);
                start.setMonth(start.getMonth() - 12);
                start.setDate(start.getDate() + 1);
                setDateRange(clampRangeToToday({ start, end: today }));
                break;
            }
            case 'allTime':
                setDateRange(clampRangeToToday({ start: new Date(MIN_FILTER_DATE), end: today }));
                break;
        }
    };

    return (
        <FilterContext.Provider
            value={{
                activeFilter,
                dateRange,
                setActiveFilter,
                handleDateRangeChange,
                setQuickFilter,
                getLast30DaysRange,
            }}
        >
            {children}
        </FilterContext.Provider>
    );
}

export function useFilterContext(): FilterContextValue {
    const ctx = useContext(FilterContext);
    if (!ctx) throw new Error('useFilterContext must be used within FilterProvider');
    return ctx;
}
