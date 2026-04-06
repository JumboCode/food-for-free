import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isAdmin } from '@/lib/admin';

const prisma = new PrismaClient();

async function requireAdmin() {
    const admin = await isAdmin(); // ✅ USE THE SAME CHECK AS LAYOUT
    if (!admin) {
        return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }
    return null;
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const adminCheck = await requireAdmin();
    if (adminCheck) return adminCheck;

    try {
        const { userId } = await params;
        const { firstName, lastName } = await request.json();

        // Update in Clerk
        await (
            await clerkClient()
        ).users.updateUser(userId, {
            firstName,
            lastName,
        });

        // Update timestamp in Postgres
        await prisma.user.update({
            where: { clerkId: userId },
            data: {
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: 'User updated successfully',
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
