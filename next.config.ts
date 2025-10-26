import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // disable ESLint during builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;