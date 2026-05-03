import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import {
    listInvitationCompanionStatuses,
    retryInvitationCompanionStatuses,
} from '~/lib/companionInvitationOrgs';

function normalizeEmail(email: string | null): string {
    return email?.trim().toLowerCase() ?? '';
}

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await requireAdmin();

        const email = normalizeEmail(req.nextUrl.searchParams.get('email'));
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const statuses = await listInvitationCompanionStatuses(email);
        return NextResponse.json({ statuses });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: 'Failed to load bundled invitation status.' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await requireAdmin();

        const body = (await req.json()) as { email?: string };
        const email = normalizeEmail(body.email ?? null);
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const result = await retryInvitationCompanionStatuses(email);
        const warning =
            result.waitingForAcceptanceCount > 0
                ? 'Still waiting for the recipient to accept the invitation email.'
                : result.stillFailingCount > 0
                  ? 'Some organizations still need attention. You can retry again in a minute.'
                  : undefined;

        return NextResponse.json({
            ...result,
            warning,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: 'Failed to retry bundled invitation status.' },
            { status: 500 }
        );
    }
}
