import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/admin';

/**
 * GET /api/user/context
 * Client-safe summary for nav + overview (partner vs admin).
 */
export async function GET() {
    try {
        const admin = await isAdmin();
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({
            isAdmin: admin,
            partnerOrganizationName: user.partner?.organizationName?.trim() ?? null,
        });
    } catch (error) {
        console.error('GET /api/user/context:', error);
        return NextResponse.json({ error: 'Failed to load context' }, { status: 500 });
    }
}
