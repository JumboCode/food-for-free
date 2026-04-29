'use client';

import { OrganizationSwitcher, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChooseOrganizationPage() {
    const { orgId } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (orgId) router.replace('/overview');
    }, [orgId, router]);

    return (
        <main className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h1 className="text-xl font-semibold text-gray-900">Choose an organization</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Select which organization you want to view right now. You can switch again later
                    from the sidebar.
                </p>
                <div className="mt-5">
                    <OrganizationSwitcher
                        hidePersonal={true}
                        afterSelectOrganizationUrl="/overview"
                        appearance={{
                            elements: {
                                rootBox: 'w-full',
                                organizationSwitcherTrigger:
                                    'w-full h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700',
                            },
                        }}
                    />
                </div>
            </div>
        </main>
    );
}
