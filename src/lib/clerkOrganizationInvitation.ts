import type { NextRequest } from 'next/server';

/** Clerk append when redirecting organization invitation recipients to your `redirectUrl`. */
export function hasOrganizationInvitationHandshake(req: Pick<NextRequest, 'nextUrl'>): boolean {
    return req.nextUrl.searchParams.has('__clerk_ticket');
}
