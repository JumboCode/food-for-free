import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/../lib/prisma';

/**
 * Check if the current user is an admin
 * Admin is determined by database role only
 */
export async function isAdmin(): Promise<boolean> {
    const { userId } = await auth();
    if (!userId) return false;

    // Check database role
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
