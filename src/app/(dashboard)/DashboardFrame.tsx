'use client';

import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import OrganizationSelect from '@/components/ui/OrganizationSelect';
import SideNavBar from '@/components/ui/SideNavbar';

export function DashboardFrame({
    isAdmin,
    showOrgChooser,
    children,
}: {
    isAdmin: boolean;
    showOrgChooser: boolean;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const chooserRequested = searchParams.get('chooseOrg') === '1';
    const [chooserOpen, setChooserOpen] = useState(showOrgChooser);

    useEffect(() => {
        setChooserOpen(showOrgChooser || chooserRequested);
    }, [showOrgChooser, chooserRequested]);

    useEffect(() => {
        if (!chooserOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [chooserOpen]);

    return (
        <>
            <SideNavBar isAdmin={isAdmin} />
            <div className="ml-16 w-[calc(100%-4rem)] min-h-screen min-w-0 bg-[#FAF9F5] lg:ml-64 lg:w-[calc(100%-16rem)]">
                <main className="min-w-0 max-w-full">{children}</main>
            </div>
            {chooserOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[1px] sm:p-6">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Choose an organization
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setChooserOpen(false);
                                    if (chooserRequested) {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.delete('chooseOrg');
                                        const qs = params.toString();
                                        router.replace(qs ? `${pathname}?${qs}` : pathname);
                                    }
                                }}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close organization chooser"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            Select which organization you want to view right now. You can switch
                            again later from the sidebar.
                        </p>
                        <div className="mt-5">
                            <OrganizationSelect className="h-11" />
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
