'use client';

import React, { createContext, useContext, type ReactNode } from 'react';

export type ViewerContextValue = {
    isAdmin: boolean;
    partnerOrganizationName: string | null;
    partnerHouseholdId18: string | null;
};

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function ViewerProvider({
    children,
    value,
}: {
    children: ReactNode;
    value: ViewerContextValue;
}) {
    return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewerContext(): ViewerContextValue {
    const ctx = useContext(ViewerContext);
    if (!ctx) throw new Error('useViewerContext must be used within ViewerProvider');
    return ctx;
}
