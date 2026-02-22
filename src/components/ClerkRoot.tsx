'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

export default function ClerkRoot({ children }: { children?: React.ReactNode }) {
    return <ClerkProvider>{children}</ClerkProvider>;
}
