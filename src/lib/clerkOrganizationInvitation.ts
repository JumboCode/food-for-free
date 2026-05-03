import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { clerkHostedSignInPathname, clerkHostedSignUpPathname } from '@/lib/clerkAuthPaths';

/** Clerk append when redirecting organization invitation recipients to your `redirectUrl`. */
export function hasOrganizationInvitationHandshake(req: Pick<NextRequest, 'nextUrl'>): boolean {
    return req.nextUrl.searchParams.has('__clerk_ticket');
}

/**
 * Clerk often sends already-signed-in users to `/` (homepage) with `__clerk_ticket` instead of
 * `signInUrl`. Our ticket UI lives on the sign-in route — funnel here while preserving query params.
 */
export function redirectOrganizationInvitationToSignInIfNeeded(
    req: NextRequest
): NextResponse | null {
    if (!hasOrganizationInvitationHandshake(req)) return null;
    const path = req.nextUrl.pathname;
    const signIn = clerkHostedSignInPathname();
    const signUp = clerkHostedSignUpPathname();
    const onSignIn = path === signIn || path.startsWith(`${signIn}/`);
    const onSignUp = path === signUp || path.startsWith(`${signUp}/`);
    if (onSignIn || onSignUp) return null;

    const url = req.nextUrl.clone();
    url.pathname = signIn;
    return NextResponse.redirect(url);
}
