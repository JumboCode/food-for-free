import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    getOrganizationMembershipListMock,
    clerkClientMock,
    userFindUniqueMock,
    partnerFindUniqueMock,
    userPartnerMembershipUpsertMock,
} = vi.hoisted(() => ({
    getOrganizationMembershipListMock: vi.fn(),
    clerkClientMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    partnerFindUniqueMock: vi.fn(),
    userPartnerMembershipUpsertMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
    clerkClient: clerkClientMock,
}));

vi.mock('~/lib/prisma', () => ({
    default: {
        user: {
            findUnique: userFindUniqueMock,
        },
        partner: {
            findUnique: partnerFindUniqueMock,
        },
        userPartnerMembership: {
            upsert: userPartnerMembershipUpsertMock,
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
        expect(userPartnerMembershipUpsertMock).not.toHaveBeenCalled();
    });

    it('loads memberships even when user already has other org links', async () => {
        userFindUniqueMock.mockResolvedValue({ id: 'db_user_1', clerkId: 'clerk_1' });
        getOrganizationMembershipListMock.mockResolvedValue({
            data: [],
        });

        await syncUserPartnerFromClerkOrgMemberships('clerk_1');

        expect(getOrganizationMembershipListMock).toHaveBeenCalled();
    });

    it('updates user with first matching partner from memberships', async () => {
        userFindUniqueMock.mockResolvedValue({ id: 'db_user_1', clerkId: 'clerk_1' });
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
        expect(userPartnerMembershipUpsertMock).toHaveBeenCalledWith({
            where: {
                userId_partnerId: {
                    userId: 'db_user_1',
                    partnerId: 'partner_999',
                },
            },
            create: {
                userId: 'db_user_1',
                partnerId: 'partner_999',
            },
            update: {},
        });
    });

    it('does not update user when no memberships match a partner', async () => {
        userFindUniqueMock.mockResolvedValue({ id: 'db_user_1', clerkId: 'clerk_1' });
        getOrganizationMembershipListMock.mockResolvedValue({
            data: [{ organization: { id: 'org_1' } }],
        });
        partnerFindUniqueMock.mockResolvedValue(null);

        await syncUserPartnerFromClerkOrgMemberships('clerk_1');

        expect(userPartnerMembershipUpsertMock).not.toHaveBeenCalled();
    });
});
