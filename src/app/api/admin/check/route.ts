import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

/**
 * GET /api/admin/check
 * Check if the current user is an admin
 * Returns: { isAdmin: boolean }
 */
export async function GET() {
    try {
        const admin = await isAdmin();
        return NextResponse.json({ isAdmin: admin });
    } catch (error: unknown) {
        console.error('Error checking admin status:', error);
        return NextResponse.json({ isAdmin: false }, { status: 500 });
    }
}
