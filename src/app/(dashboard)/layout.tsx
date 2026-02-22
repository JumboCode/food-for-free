import { type Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import SideNavBar from '@/components/ui/SideNavbar';
// import ClerkRoot from '@/components/ClerkRoot';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        // <ClerkRoot>
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <SideNavBar />
                <div className="ml-16 sm:ml-56">
                    <main className="p-6">{children}</main>
                </div>
            </body>
        </html>
        // </ClerkRoot>
    );
}
