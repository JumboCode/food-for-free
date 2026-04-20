import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { clerkPartnerPortalAppearance } from '@/lib/clerkPartnerTheme';
import { getOverviewRedirectUrl } from '@/lib/requestOrigin';

function hasClerkInvitationTicket(searchParams: Record<string, string | string[] | undefined>) {
    for (const key of Object.keys(searchParams)) {
        const lower = key.toLowerCase();
        if (lower.includes('ticket') && lower.startsWith('__clerk')) return true;
    }
    return false;
}

function PartnerPortalAuthHeader({ subtitle }: { subtitle: string }) {
    return (
        <div className="w-full text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1C5E2C]/70">
                Food For Free
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1C5E2C] sm:text-3xl">
                Partner Portal
            </h1>
            <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
            <p className="mt-2 text-xs text-[#1C5E2C]/75 sm:hidden">
                For the best experience, please use a desktop or tablet.
            </p>
        </div>
    );
}

function PartnerPortalAuthFooter() {
    return (
        <div className="flex w-full flex-col items-center gap-1 text-center text-xs text-gray-500">
            <span className="max-w-sm text-balance">
                Need help? Contact your Food For Free administrator.
            </span>
            <Link href="/" className="font-medium text-[#1C5E2C] hover:text-[#164a22]">
                Back to home
            </Link>
        </div>
    );
}

export default async function SignUpPage({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
    const overviewRedirectUrl = await getOverviewRedirectUrl();
    const params = (await searchParams) ?? {};
    const invited = hasClerkInvitationTicket(params);

    if (!invited) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#E7F3EB] px-4 py-10">
                <div className="flex w-full max-w-md flex-col items-stretch gap-6">
                    <PartnerPortalAuthHeader subtitle="Sign up is available through an invitation link only." />
                    <div className="w-full rounded-2xl border border-[#1C5E2C]/12 bg-white p-6 shadow-[0_8px_30px_-8px_rgba(17,24,39,0.12)] ring-1 ring-black/4">
                        <h2 className="text-lg font-semibold text-[#1C5E2C]">
                            Invitation required
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            New accounts are created from an email invitation. If you already have
                            access, use Sign in instead.
                        </p>
                        <div className="mt-5 flex flex-col items-center gap-2">
                            <Link
                                href="/sign-in"
                                className="inline-flex justify-center rounded-lg bg-[#1C5E2C] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                    <PartnerPortalAuthFooter />
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#E7F3EB] px-4 py-10">
            <div className="flex w-full max-w-md flex-col items-stretch gap-6">
                <PartnerPortalAuthHeader subtitle="Complete sign up using your invitation." />
                <p className="-mt-3 mx-auto max-w-sm text-center text-xs leading-relaxed text-gray-500">
                    Use the same email this invitation was sent to, including Google sign-in.
                </p>
                <div className="w-full">
                    <SignUp
                        forceRedirectUrl={overviewRedirectUrl}
                        appearance={clerkPartnerPortalAppearance}
                    />
                </div>
                <PartnerPortalAuthFooter />
            </div>
        </main>
    );
}
