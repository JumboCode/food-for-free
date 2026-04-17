import { describe, expect, it } from 'vitest';

import {
    overviewScopeErrorResponse,
    scopeToPartnerHouseholdId18,
    type OverviewScope,
} from '~/lib/overviewAccess';

describe('overview access helpers', () => {
    it('returns household id for admin and partner scopes', () => {
        const adminScope: OverviewScope = {
            kind: 'admin',
            destination: 'Org A',
            destinationHouseholdId18: 'admin_hh_18',
        };
        const partnerScope: OverviewScope = {
            kind: 'partner',
            destination: 'Org B',
            partnerHouseholdId18: 'hh_18',
        };

        expect(scopeToPartnerHouseholdId18(partnerScope)).toBe('hh_18');
        expect(scopeToPartnerHouseholdId18(adminScope)).toBe('admin_hh_18');
    });

    it('returns no household id for unauthenticated/no-org scopes', () => {
        expect(scopeToPartnerHouseholdId18({ kind: 'unauthenticated' })).toBeUndefined();
        expect(scopeToPartnerHouseholdId18({ kind: 'no_db_user' })).toBeUndefined();
        expect(scopeToPartnerHouseholdId18({ kind: 'partner_no_org' })).toBeUndefined();
    });

    it('maps unauthorized scopes to HTTP 401', async () => {
        const response = overviewScopeErrorResponse({ kind: 'unauthenticated' });
        expect(response?.status).toBe(401);
        await expect(response?.json()).resolves.toEqual({ error: 'Unauthorized' });
    });

    it('maps partner-without-org to HTTP 403', async () => {
        const response = overviewScopeErrorResponse({ kind: 'partner_no_org' });
        expect(response?.status).toBe(403);
        await expect(response?.json()).resolves.toEqual({
            error: 'No organization is assigned to your account yet.',
        });
    });

    it('returns no error response for valid admin/partner scopes', () => {
        expect(
            overviewScopeErrorResponse({
                kind: 'admin',
                destination: 'Partner X',
                destinationHouseholdId18: undefined,
            })
        ).toBeNull();
        expect(
            overviewScopeErrorResponse({
                kind: 'partner',
                destination: 'Partner X',
                partnerHouseholdId18: 'x',
            })
        ).toBeNull();
    });
});
