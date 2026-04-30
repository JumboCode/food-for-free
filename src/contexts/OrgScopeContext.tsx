'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type OrgScope = { name: string; householdId18?: string | null } | null;

type OrgScopeContextValue = {
    selectedOrgs: Exclude<OrgScope, null>[];
    setSelectedOrgs: React.Dispatch<React.SetStateAction<Exclude<OrgScope, null>[]>>;
    selectedOrg: OrgScope;
    setSelectedOrg: React.Dispatch<React.SetStateAction<OrgScope>>;
    toggleSelectedOrg: (org: Exclude<OrgScope, null>) => void;
    clearSelectedOrgs: () => void;
    clearSelectedOrg: () => void;
};

const OrgScopeContext = createContext<OrgScopeContextValue | null>(null);

export function OrgScopeProvider({ children }: { children: ReactNode }) {
    const [selectedOrgs, setSelectedOrgs] = useState<Exclude<OrgScope, null>[]>([]);

    return (
        <OrgScopeContext.Provider
            value={{
                selectedOrgs,
                setSelectedOrgs,
                selectedOrg: selectedOrgs[0] ?? null,
                setSelectedOrg: next => {
                    if (typeof next === 'function') {
                        setSelectedOrgs(prev => {
                            const current = prev[0] ?? null;
                            const resolved = next(current);
                            return resolved ? [resolved] : [];
                        });
                        return;
                    }
                    setSelectedOrgs(next ? [next] : []);
                },
                toggleSelectedOrg: org => {
                    setSelectedOrgs(prev => {
                        const key = org.householdId18?.trim()
                            ? `id:${org.householdId18.trim()}`
                            : `name:${org.name.trim().toLowerCase()}`;
                        const exists = prev.some(p => {
                            const k = p.householdId18?.trim()
                                ? `id:${p.householdId18.trim()}`
                                : `name:${p.name.trim().toLowerCase()}`;
                            return k === key;
                        });
                        if (exists) {
                            return prev.filter(p => {
                                const k = p.householdId18?.trim()
                                    ? `id:${p.householdId18.trim()}`
                                    : `name:${p.name.trim().toLowerCase()}`;
                                return k !== key;
                            });
                        }
                        return [...prev, org];
                    });
                },
                clearSelectedOrgs: () => setSelectedOrgs([]),
                clearSelectedOrg: () => setSelectedOrgs([]),
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
