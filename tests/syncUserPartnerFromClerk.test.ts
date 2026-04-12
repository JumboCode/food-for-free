import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    getOrganizationMembershipListMock,
    clerkClientMock,
    userFindUniqueMock,
    partnerFindUniqueMock,
    userUpdateMock,
} = vi.hoisted(() => ({
    getOrganizationMembershipListMock: vi.fn(),
    clerkClientMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    partnerFindUniqueMock: vi.fn(),
    userUpdateMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
    clerkClient: clerkClientMock,
}));

vi.mock('~/lib/prisma', () => ({
    default: {
        user: {
            findUnique: userFindUniqueMock,
            update: userUpdateMock,
        },
        partner: {
            findUnique: partnerFindUniqueMock,
        },
    },
}));

import { syncUserPartnerFromClerkOrgMemberships } from '~/lib/syncUserPartnerFromClerk';

describe('syncUserPartnerFromClerkOrgMemberships', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clerkClientMock.mockResolvedValue({
            users: {
                getOrganizationMembershipList: getOrganizationMembershipListMock,
            },
        });
    });

    it('returns early if user does not exist in db', async () => {
        userFindUniqueMock.mockResolvedValue(null);

        await syncUserPartnerFromClerkOrgMemberships('clerk_missing');

        expect(getOrganizationMembershipListMock).not.toHaveBeenCalled();
        expect(userUpdateMock).not.toHaveBeenCalled();
    });

    it('returns early if user already has partnerId', async () => {
        userFindUniqueMock.mockResolvedValue({ clerkId: 'clerk_1', partnerId: 'h_123' });

        await syncUserPartnerFromClerkOrgMemberships('clerk_1');

        expect(getOrganizationMembershipListMock).not.toHaveBeenCalled();
    });

    it('updates user with first matching partner from memberships', async () => {
        userFindUniqueMock.mockResolvedValue({ clerkId: 'clerk_1', partnerId: null });
        getOrganizationMembershipListMock.mockResolvedValue({
            data: [{ organization: { id: 'org_no_match' } }, { organization: { id: 'org_match' } }],
        });
        partnerFindUniqueMock
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ householdId18: 'partner_999' });

        await syncUserPartnerFromClerkOrgMemberships('clerk_1');

        expect(getOrganizationMembershipListMock).toHaveBeenCalledWith({
            userId: 'clerk_1',
            limit: 100,
        });
        expect(userUpdateMock).toHaveBeenCalledWith({
            where: { clerkId: 'clerk_1' },
            data: { partnerId: 'partner_999' },
        });
    });

    it('does not update user when no memberships match a partner', async () => {
        userFindUniqueMock.mockResolvedValue({ clerkId: 'clerk_1', partnerId: null });
        getOrganizationMembershipListMock.mockResolvedValue({
            data: [{ organization: { id: 'org_1' } }],
        });
        partnerFindUniqueMock.mockResolvedValue(null);

        await syncUserPartnerFromClerkOrgMemberships('clerk_1');

        expect(userUpdateMock).not.toHaveBeenCalled();
    });
});
