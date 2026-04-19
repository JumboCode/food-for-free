import type { ComponentProps } from 'react';
import type { SignIn } from '@clerk/nextjs';

type ClerkAppearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

/** Shared Clerk UI styling for Partner Portal sign-in / sign-up. */
export const clerkPartnerPortalAppearance: ClerkAppearance = {
    variables: {
        colorPrimary: '#1C5E2C',
        colorText: '#111827',
        colorTextSecondary: '#4b5563',
        colorBackground: '#ffffff',
        colorInputBackground: '#ffffff',
        colorInputText: '#111827',
        borderRadius: '0.75rem',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    },
    elements: {
        // Keep Clerk wrappers centered within the shared column on all breakpoints.
        rootBox: 'w-full mx-auto',
        cardBox: 'w-full mx-auto',
        // Symmetric shadow avoids the “shifted left” optical illusion from one-sided drop shadows.
        card: 'w-full border border-[#1C5E2C]/12 bg-white rounded-2xl shadow-[0_8px_30px_-8px_rgba(17,24,39,0.12)] ring-1 ring-black/4',
        header: 'text-center',
        headerTitle: 'text-[#1C5E2C] text-center',
        headerSubtitle: 'text-gray-600 text-center',
        socialButtonsBlockButton: 'border-gray-200 text-gray-800 hover:bg-gray-50',
        formButtonPrimary: 'bg-[#1C5E2C] hover:bg-[#164a22] text-white shadow-sm',
        footerActionLink: 'text-[#1C5E2C] font-medium hover:text-[#164a22]',
        identityPreviewText: 'text-gray-800',
        formFieldInput: 'rounded-lg border-gray-200 focus:border-[#1C5E2C] focus:ring-[#1C5E2C]/20',
        formFieldLabel: 'text-gray-700',
        dividerLine: 'bg-gray-200',
        dividerText: 'text-gray-500',
    },
};
