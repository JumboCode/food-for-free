/**
 * App-hosted sign-in/up routes. If `NEXT_PUBLIC_CLERK_SIGN_IN_URL` is unset, Clerk
 * defaults to the hosted Account Portal (`*.accounts.dev`) for `auth.protect()` redirects.
 * @see https://clerk.com/docs/guides/development/clerk-environment-variables#sign-in-and-sign-up-redirects
 */
export const CLERK_SIGN_IN_PATH = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL?.trim() || '/sign-in';
export const CLERK_SIGN_UP_PATH = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL?.trim() || '/sign-up';

/** Pathname only (for redirects/middleware). Handles mis-set full URLs in env. */
function clerkAppPathname(raw: string, fallback: string): string {
    const t = raw.trim();
    if (t.startsWith('http://') || t.startsWith('https://')) {
        try {
            return new URL(t).pathname || fallback;
        } catch {
            return fallback;
        }
    }
    return t.startsWith('/') ? t : `/${t}`;
}

export function clerkHostedSignInPathname(): string {
    return clerkAppPathname(CLERK_SIGN_IN_PATH, '/sign-in');
}

export function clerkHostedSignUpPathname(): string {
    return clerkAppPathname(CLERK_SIGN_UP_PATH, '/sign-up');
}
