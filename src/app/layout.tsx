import { type Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { CLERK_SIGN_IN_PATH, CLERK_SIGN_UP_PATH } from '@/lib/clerkAuthPaths';
import { getOverviewRedirectUrl } from '@/lib/requestOrigin';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Food for Free Partner Portal',
    description: 'A website for Food for Free partners to view their delivery data',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const overviewRedirectUrl = await getOverviewRedirectUrl();
    return (
        <ClerkProvider
            signInUrl={CLERK_SIGN_IN_PATH}
            signUpUrl={CLERK_SIGN_UP_PATH}
            signInForceRedirectUrl={overviewRedirectUrl}
            signUpForceRedirectUrl={overviewRedirectUrl}
        >
            <html lang="en">
                <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                    {children}
                </body>
            </html>
        </ClerkProvider>
    );
}
