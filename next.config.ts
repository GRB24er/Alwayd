import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REMOVE output: 'export'
  // REMOVE trailingSlash: true

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    dangerouslyAllowSVG: true,
    unoptimized: true,
  },
};

export default nextConfig;
