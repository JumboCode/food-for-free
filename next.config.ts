import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
    outputFileTracingRoot: process.cwd(),
    eslint: {
        // disable ESLint during builds
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
