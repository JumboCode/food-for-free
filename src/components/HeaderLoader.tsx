'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const ClerkRoot = dynamic(() => import('@/components/ClerkRoot'), { ssr: false });

export default function HeaderLoader() {
    return <ClerkRoot />;
}
