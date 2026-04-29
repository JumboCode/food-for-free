import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { CLERK_SIGN_IN_PATH, CLERK_SIGN_UP_PATH } from '@/lib/clerkAuthPaths';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
    '/overview(.*)',
    '/distribution(.*)',
    '/sticker-sheet(.*)',
    '/admin(.*)',
    '/choose-organization(.*)',
    '/api/((?!webhooks/clerk).*)',
]);

const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(
    async (auth, req) => {
        const { userId } = await auth();

        if (isAuthRoute(req) && userId) {
            return NextResponse.redirect(new URL('/overview', req.url));
        }

        if (isProtectedRoute(req)) {
            await auth.protect();
        }
    },
    { signInUrl: CLERK_SIGN_IN_PATH, signUpUrl: CLERK_SIGN_UP_PATH }
);

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
