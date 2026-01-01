import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/../lib/prisma';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/**
 * Check if the current user is an admin
 * Admin is determined by:
 * 1. Email matches ADMIN_EMAIL env variable, OR
 * 2. User has ADMIN role in database, OR
 * 3. User is admin of any Clerk Organization (org:admin role)
 */
export async function isAdmin(): Promise<boolean> {
    const { userId, orgId, orgRole } = await auth();
    if (!userId) return false;

    const user = await currentUser();
    if (!user) return false;

    const emailAddress = user.emailAddresses[0]?.emailAddress;

    // Check if user is admin of any Clerk Organization
    if (orgRole === 'org:admin') {
        // Ensure user exists in DB with ADMIN role
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!dbUser) {
            await prisma.user.create({
                data: {
                    clerkId: userId,
                    email: emailAddress || '',
                    role: 'ADMIN',
                },
            });
        } else if (dbUser.role !== 'ADMIN') {
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { role: 'ADMIN' },
            });
        }
        return true;
    }

    // Check if user email matches admin email from env (if configured)
    if (ADMIN_EMAIL && emailAddress === ADMIN_EMAIL) {
        // Ensure user exists in DB with ADMIN role
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!dbUser) {
            // Create admin user if doesn't exist
            await prisma.user.create({
                data: {
                    clerkId: userId,
                    email: emailAddress,
                    role: 'ADMIN',
                },
            });
            return true;
        }

        // Update role to ADMIN if not already
        if (dbUser.role !== 'ADMIN') {
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { role: 'ADMIN' },
            });
        }

        return true;
    }

    // Check database role (allows for multiple admins if needed)
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
