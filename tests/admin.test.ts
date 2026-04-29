import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, findUniqueMock, partnerFindUniqueMock, userUpdateManyMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    findUniqueMock: vi.fn(),
    partnerFindUniqueMock: vi.fn(),
    userUpdateManyMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
    auth: authMock,
}));

vi.mock('@/../lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: findUniqueMock,
            updateMany: userUpdateManyMock,
        },
        partner: {
            findUnique: partnerFindUniqueMock,
        },
    },
}));

import { getCurrentUser, isAdmin, requireAdmin } from '@/lib/admin';

describe('admin helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('isAdmin returns false when no user id present', async () => {
        authMock.mockResolvedValue({ userId: null, orgId: null });
        await expect(isAdmin()).resolves.toBe(false);
        expect(findUniqueMock).not.toHaveBeenCalled();
    });

    it('isAdmin returns true for ADMIN role', async () => {
        authMock.mockResolvedValue({ userId: 'clerk_123', orgId: null });
        findUniqueMock.mockResolvedValue({ role: 'ADMIN' });
        await expect(isAdmin('clerk_123')).resolves.toBe(true);
        expect(findUniqueMock).toHaveBeenCalledWith({
            where: { clerkId: 'clerk_123' },
            select: { role: true },
        });
    });

    it('getCurrentUser returns null for unauthenticated request', async () => {
        authMock.mockResolvedValue({ userId: null, orgId: null });
        await expect(getCurrentUser()).resolves.toBeNull();
    });

    it('getCurrentUser fetches user with partner include', async () => {
        authMock.mockResolvedValue({ userId: 'clerk_abc', orgId: null });
        findUniqueMock.mockResolvedValue({ id: 'db-1', role: 'PARTNER' });
        await expect(getCurrentUser()).resolves.toEqual({
            id: 'db-1',
            role: 'PARTNER',
            partner: null,
        });
        expect(findUniqueMock).toHaveBeenCalledWith({
            where: { clerkId: 'clerk_abc' },
            include: {
                partnerMemberships: {
                    include: { partner: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
    });

    it('requireAdmin throws when current user is not admin', async () => {
        authMock.mockResolvedValue({ userId: 'clerk_no_admin', orgId: null });
        findUniqueMock.mockResolvedValue({ role: 'PARTNER' });
        await expect(requireAdmin()).rejects.toThrow('Unauthorized: Admin access required');
    });
});
