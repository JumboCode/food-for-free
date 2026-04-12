'use client';

import SideNavBar from '@/components/ui/SideNavbar';

export function DashboardFrame({
    isAdmin,
    children,
}: {
    isAdmin: boolean;
    children: React.ReactNode;
}) {
    return (
        <>
            <SideNavBar isAdmin={isAdmin} />
            <div className="ml-16 w-[calc(100%-4rem)] min-h-screen min-w-0 bg-[#FAF9F5] sm:ml-56 sm:w-[calc(100%-14rem)]">
                <main className="min-w-0 max-w-full">{children}</main>
            </div>
        </>
    );
}
