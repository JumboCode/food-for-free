import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< Updated upstream
  /* config options here */
=======
  eslint: {
    // disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  // Ensures file-tracing works correctly if you're using a monorepo or custom layout
  outputFileTracingRoot: __dirname,
>>>>>>> Stashed changes
};

export default nextConfig;