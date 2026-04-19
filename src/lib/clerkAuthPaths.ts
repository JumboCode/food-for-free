/**
 * App-hosted sign-in/up routes. If `NEXT_PUBLIC_CLERK_SIGN_IN_URL` is unset, Clerk
 * defaults to the hosted Account Portal (`*.accounts.dev`) for `auth.protect()` redirects.
 * @see https://clerk.com/docs/guides/development/clerk-environment-variables#sign-in-and-sign-up-redirects
 */
export const CLERK_SIGN_IN_PATH = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL?.trim() || '/sign-in';
export const CLERK_SIGN_UP_PATH = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL?.trim() || '/sign-up';
