'use client';

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { clerkPartnerPortalAppearance } from '@/lib/clerkPartnerTheme';
import { PartnerOrganizationInvitation } from '@/components/auth/PartnerOrganizationInvitation';

type Props = {
    overviewRedirectUrl: string;
    overviewRedirectPath: string;
};

/**
 * Invitation links attach `__clerk_ticket` to whichever `redirect_url` admins configure.
 * When present we must finish the Clerk ticket flow instead of default email/password sign-in.
 */
export function PartnerSignInGate({ overviewRedirectUrl, overviewRedirectPath }: Props) {
    const searchParams = useSearchParams();
    const invitationTicket = searchParams.get('__clerk_ticket');

    if (invitationTicket) {
        return <PartnerOrganizationInvitation overviewRedirectPath={overviewRedirectPath} />;
    }

    return (
        <SignIn forceRedirectUrl={overviewRedirectUrl} appearance={clerkPartnerPortalAppearance} />
    );
}
