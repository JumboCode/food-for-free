import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
    '/overview(.*)',
    '/distribution(.*)',
    '/sticker-sheet(.*)',
    '/admin(.*)',
    '/api/((?!webhooks/clerk).*)',
]);
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

// export default clerkMiddleware(async (auth, req) => {
//     // Protect admin routes

//     if (isAdminRoute(req)) {
//         const { userId } = await auth();

//         if (!userId) {
//             // Redirect to sign-in if not authenticated
//             const signInUrl = new URL('/sign-in', req.url);
//             signInUrl.searchParams.set('redirect_url', req.url);
//             return NextResponse.redirect(signInUrl);
//         }
//     }
// });

const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();

    if (isProtectedRoute(req)) {
        await auth.protect();

        // if user is authenticated and tries to visit sign-in/sign-up, redirect to /overview
        if (isAuthRoute(req) && userId) {
            return NextResponse.redirect(new URL('/overview', req.url));
        }

        // protect all other protected routes

        // Enforce admin-only access for /admin routes
        if (isAdminRoute(req)) {
            // Only allow admins
            const admin = await isAdmin();
            if (!admin) {
                // Redirect to /overview or return 403
                return NextResponse.redirect(new URL('/overview', req.url));
                // Alternatively: return new NextResponse('Forbidden', { status: 403 });
            }
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
