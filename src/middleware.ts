import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define protected routes
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
    // Protect admin routes
    if (isAdminRoute(req)) {
        const { userId } = await auth();

        if (!userId) {
            // Redirect to sign-in if not authenticated
            const signInUrl = new URL('/sign-in', req.url);
            signInUrl.searchParams.set('redirect_url', req.url);
            return NextResponse.redirect(signInUrl);
        }
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
