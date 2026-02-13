'use client';

import React from 'react';
import {
    ClerkProvider,
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
} from '@clerk/nextjs';

export default function ClerkRoot({ children }: { children?: React.ReactNode }) {
    return (
        <ClerkProvider>
            {children}
        </ClerkProvider>
    );
}
