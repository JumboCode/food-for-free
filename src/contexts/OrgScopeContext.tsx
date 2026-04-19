'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type OrgScope = { name: string; householdId18?: string | null } | null;

type OrgScopeContextValue = {
    selectedOrg: OrgScope;
    setSelectedOrg: React.Dispatch<React.SetStateAction<OrgScope>>;
    clearSelectedOrg: () => void;
};

const OrgScopeContext = createContext<OrgScopeContextValue | null>(null);

export function OrgScopeProvider({ children }: { children: ReactNode }) {
    const [selectedOrg, setSelectedOrg] = useState<OrgScope>(null);

    return (
        <OrgScopeContext.Provider
            value={{
                selectedOrg,
                setSelectedOrg,
                clearSelectedOrg: () => setSelectedOrg(null),
            }}
        >
            {children}
        </OrgScopeContext.Provider>
    );
}

export function useOrgScopeContext(): OrgScopeContextValue {
    const ctx = useContext(OrgScopeContext);
    if (!ctx) throw new Error('useOrgScopeContext must be used within OrgScopeProvider');
    return ctx;
}
