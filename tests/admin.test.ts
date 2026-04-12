import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, findUniqueMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    findUniqueMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
    auth: authMock,
}));

vi.mock('@/../lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: findUniqueMock,
        },
    },
}));

import { getCurrentUser, isAdmin, requireAdmin } from '@/lib/admin';

describe('admin helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('isAdmin returns false when no user id present', async () => {
        authMock.mockResolvedValue({ userId: null });
        await expect(isAdmin()).resolves.toBe(false);
        expect(findUniqueMock).not.toHaveBeenCalled();
    });

    it('isAdmin returns true for ADMIN role', async () => {
        findUniqueMock.mockResolvedValue({ role: 'ADMIN' });
        await expect(isAdmin('clerk_123')).resolves.toBe(true);
        expect(findUniqueMock).toHaveBeenCalledWith({
            where: { clerkId: 'clerk_123' },
        });
    });

    it('getCurrentUser returns null for unauthenticated request', async () => {
        authMock.mockResolvedValue({ userId: null });
        await expect(getCurrentUser()).resolves.toBeNull();
    });

    it('getCurrentUser fetches user with partner include', async () => {
        authMock.mockResolvedValue({ userId: 'clerk_abc' });
        findUniqueMock.mockResolvedValue({ id: 'db-1', role: 'PARTNER' });
        await expect(getCurrentUser()).resolves.toEqual({ id: 'db-1', role: 'PARTNER' });
        expect(findUniqueMock).toHaveBeenCalledWith({
            where: { clerkId: 'clerk_abc' },
            include: { partner: true },
        });
    });

    it('requireAdmin throws when current user is not admin', async () => {
        authMock.mockResolvedValue({ userId: 'clerk_no_admin' });
        findUniqueMock.mockResolvedValue({ role: 'PARTNER' });
        await expect(requireAdmin()).rejects.toThrow('Unauthorized: Admin access required');
    });
});
