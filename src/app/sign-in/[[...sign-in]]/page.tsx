import Link from 'next/link';
import { Suspense } from 'react';
import { PartnerSignInGate } from '@/components/auth/PartnerSignInGate';
import { getOverviewRedirectUrl } from '@/lib/requestOrigin';

function SignInPanelFallback() {
    return (
        <div className="flex min-h-96 w-full flex-col justify-center rounded-2xl border border-[#1C5E2C]/12 bg-white/80 px-8 py-12 text-center text-sm text-gray-600 shadow-[0_8px_30px_-8px_rgba(17,24,39,0.12)] ring-1 ring-black/5">
            Loading…
        </div>
    );
}

export default async function SignInPage() {
    const overviewRedirectUrl = await getOverviewRedirectUrl();
    const overviewRedirectPath = '/overview';

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#E7F3EB] px-4 py-10">
            <div className="flex w-full max-w-md flex-col items-stretch gap-6">
                <div className="w-full text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#1C5E2C]/70">
                        Food For Free
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1C5E2C] sm:text-3xl">
                        Partner Portal
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Sign in to view delivery statistics for your organization.
                    </p>
                    <p className="mt-2 text-xs text-[#1C5E2C]/75 sm:hidden">
                        For the best experience, please use a desktop or tablet.
                    </p>
                </div>

                <div className="w-full">
                    <Suspense fallback={<SignInPanelFallback />}>
                        <PartnerSignInGate
                            overviewRedirectUrl={overviewRedirectUrl}
                            overviewRedirectPath={overviewRedirectPath}
                        />
                    </Suspense>
                </div>

                <div className="flex w-full flex-col items-center gap-1 text-center text-xs text-gray-500">
                    <span className="max-w-sm text-balance">
                        Need help? Contact your Food For Free administrator.
                    </span>
                    <Link href="/" className="font-medium text-[#1C5E2C] hover:text-[#164a22]">
                        Back to home
                    </Link>
                </div>
            </div>
        </main>
    );
}
