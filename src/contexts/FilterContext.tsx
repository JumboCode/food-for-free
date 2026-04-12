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
        setDateRange(range);
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
                setDateRange({ start: thirtyDaysAgo, end: today });
                break;
            }
            case 'thisMonth':
                setDateRange({
                    start: new Date(currentYear, currentMonth, 1),
                    end: new Date(currentYear, currentMonth + 1, 0),
                });
                break;
            case 'thisYear':
                setDateRange({
                    start: new Date(currentYear, 0, 1),
                    end: new Date(currentYear, 11, 31),
                });
                break;
            case 'fiscalYearToDate':
                setDateRange(getFiscalYearToDateRange(now));
                break;
            case 'past12months': {
                const start = new Date(today);
                start.setMonth(start.getMonth() - 12);
                start.setDate(start.getDate() + 1);
                setDateRange({ start, end: today });
                break;
            }
            case 'allTime':
                setDateRange({ start: new Date(2000, 0, 1), end: today });
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
