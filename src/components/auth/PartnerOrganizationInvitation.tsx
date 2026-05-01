'use client';

import { useAuth, useClerk, useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

function describeClerkError(error: unknown): string | null {
    if (!error || typeof error !== 'object') return null;
    const obj = error as {
        errors?: Array<{ message?: unknown; longMessage?: unknown }>;
    };
    const first = obj.errors?.[0];
    if (!first) return null;
    const longMessage = typeof first.longMessage === 'string' ? first.longMessage.trim() : '';
    if (longMessage) return longMessage;
    const message = typeof first.message === 'string' ? first.message.trim() : '';
    return message || null;
}

type Props = {
    overviewRedirectPath: string;
};

/**
 * Clerk org-invite redirect lands with `__clerk_ticket` + `__clerk_status`. Hosted `<SignIn />`
 * does not complete this handshake: use `signIn.ticket()`, then finalize. Logged-in users may
 * need a clean session reload first (multiple partner invites).
 * @see https://clerk.com/docs/guides/development/custom-flows/organizations/accept-organization-invitations
 * @see https://github.com/clerk/javascript/issues/8044
 */
export function PartnerOrganizationInvitation({ overviewRedirectPath }: Props) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const clerk = useClerk();
    const { isSignedIn, isLoaded: authLoaded } = useAuth();
    const { signIn, isLoaded: signInLoaded } = useSignIn();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [recoveringSession, setRecoveringSession] = useState(false);
    const attemptedTicketRef = useRef(false);
    const logoutForInviteStarted = useRef(false);

    const token = searchParams.get('__clerk_ticket');
    const accountStatus = searchParams.get('__clerk_status');

    useEffect(() => {
        if (!token) return;

        if (accountStatus === 'sign_up') {
            router.replace(`/sign-up?${searchParams.toString()}`);
            return;
        }

        if (!authLoaded || !signInLoaded) return;

        if (accountStatus === 'complete') {
            router.replace(overviewRedirectPath);
            router.refresh();
            return;
        }

        const waitingForInvitationTicket =
            accountStatus === 'sign_in' ||
            accountStatus === null ||
            accountStatus === undefined ||
            accountStatus === '';

        if (!waitingForInvitationTicket) {
            setErrorMessage(
                'This invitation link is not valid. Ask your administrator to send a fresh invitation.'
            );
            return;
        }

        void (async () => {
            if (isSignedIn) {
                if (logoutForInviteStarted.current) return;
                logoutForInviteStarted.current = true;
                setRecoveringSession(true);
                try {
                    await clerk.signOut();
                } finally {
                    window.location.assign(
                        `${window.location.pathname}?${searchParams.toString()}`
                    );
                }
                return;
            }

            if (!signIn || attemptedTicketRef.current) return;
            attemptedTicketRef.current = true;

            try {
                const ticketFn = (
                    signIn as unknown as {
                        ticket?: (args: { ticket: string }) => Promise<{ error?: unknown } | void>;
                    }
                ).ticket;

                if (typeof ticketFn !== 'function') {
                    setErrorMessage(
                        'This app cannot finish invitation sign-in automatically. Contact support.'
                    );
                    attemptedTicketRef.current = false;
                    return;
                }

                const ticketResult = await ticketFn.call(signIn, { ticket: token });
                const err =
                    ticketResult &&
                    typeof ticketResult === 'object' &&
                    'error' in ticketResult &&
                    ticketResult.error
                        ? ticketResult.error
                        : null;

                if (err) {
                    const described = describeClerkError(err);
                    setErrorMessage(
                        described ||
                            'This invitation could not be applied to your account. Try the link again.'
                    );
                    attemptedTicketRef.current = false;
                    return;
                }

                const rawStatus =
                    typeof signIn === 'object' && signIn !== null && 'status' in signIn
                        ? ((signIn as { status?: string }).status ?? '')
                        : '';

                if (rawStatus !== 'complete') {
                    setErrorMessage(
                        'Additional verification is required before this invitation completes. Try opening the invitation link once more.'
                    );
                    attemptedTicketRef.current = false;
                    return;
                }

                const finalizeFn = (
                    signIn as unknown as {
                        finalize?: (args: {
                            navigate?: (opts: {
                                session?: { currentTask?: unknown };
                                decorateUrl: (relativePath: string) => string;
                            }) => void;
                        }) => Promise<void>;
                    }
                ).finalize;

                if (typeof finalizeFn === 'function') {
                    await finalizeFn.call(signIn, {
                        navigate: ({ session, decorateUrl }) => {
                            if (session?.currentTask) return;
                            const url = decorateUrl(overviewRedirectPath);
                            if (url.startsWith('http')) window.location.href = url;
                            else router.replace(url);
                            router.refresh();
                        },
                    });
                    return;
                }

                router.replace(overviewRedirectPath);
                router.refresh();
            } catch (e: unknown) {
                const described = describeClerkError(e);
                setErrorMessage(
                    described ??
                        'Something went wrong accepting this invitation. Ask your administrator to resend it.'
                );
                attemptedTicketRef.current = false;
            }
        })();
    }, [
        accountStatus,
        authLoaded,
        clerk,
        isSignedIn,
        overviewRedirectPath,
        router,
        searchParams,
        signIn,
        signInLoaded,
        token,
    ]);

    if (errorMessage) {
        return (
            <div className="flex w-full flex-col gap-4 rounded-2xl border border-red-100 bg-white p-6 shadow-[0_8px_30px_-8px_rgba(17,24,39,0.12)] ring-1 ring-black/5">
                <div>
                    <h2 className="text-lg font-semibold text-[#1C5E2C]">
                        Invitation could not finish
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-lg bg-[#1C5E2C] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                        onClick={() => router.replace(overviewRedirectPath)}
                    >
                        Go to overview
                    </button>
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => router.replace('/sign-in')}
                    >
                        Regular sign-in
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-[#1C5E2C]/12 bg-white p-8 text-center shadow-[0_8px_30px_-8px_rgba(17,24,39,0.12)] ring-1 ring-black/5">
            <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-[#1C5E2C] border-r-transparent"
                aria-hidden
            />
            <p className="text-sm text-gray-600">
                {recoveringSession
                    ? 'Refreshing your session so you can join another organization…'
                    : 'Accepting your organization invitation…'}
            </p>
            <p className="max-w-sm text-xs text-gray-500">
                Invited to several partners? Open each invitation email once; then switch
                organizations from the sidebar when you&apos;re signed in.
            </p>
        </div>
    );
}
