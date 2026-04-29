'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import OrganizationSelect from '@/components/ui/OrganizationSelect';

export default function ChooseOrganizationPage() {
    const router = useRouter();

    return (
        <main className="relative min-h-screen">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
            <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Choose an organization
                        </h1>
                        <button
                            type="button"
                            onClick={() => router.push('/overview')}
                            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Close organization chooser"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        Select which organization you want to view right now. You can switch again
                        later from the sidebar.
                    </p>
                    <div className="mt-5">
                        <OrganizationSelect className="h-11" />
                    </div>
                </div>
            </div>
        </main>
    );
}
