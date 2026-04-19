import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { clerkPartnerPortalAppearance } from '@/lib/clerkPartnerTheme';
import { getOverviewRedirectUrl } from '@/lib/requestOrigin';

export default async function SignInPage() {
    const overviewRedirectUrl = await getOverviewRedirectUrl();
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
                    <SignIn
                        forceRedirectUrl={overviewRedirectUrl}
                        appearance={clerkPartnerPortalAppearance}
                    />
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
