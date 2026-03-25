import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/../lib/prisma';

/**
 * Check if the current user is an admin.
 * - In middleware, pass the userId from the `auth` argument.
 * - In other server contexts, call without args to let Clerk's `auth()` resolve it.
 */
export async function isAdmin(userIdOverride?: string | null): Promise<boolean> {
    const userId = userIdOverride ?? (await auth()).userId;
    if (!userId) return false;

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
    });

    return dbUser?.role === 'ADMIN';
}

/**
 * Get the current user's database record
 */
export async function getCurrentUser() {
    const { userId } = await auth();
    if (!userId) return null;

    return await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { partner: true },
    });
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin() {
    const admin = await isAdmin();
    if (!admin) {
        throw new Error('Unauthorized: Admin access required');
    }
}
