import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  // The dev overlay button is injected into the page and would otherwise appear
  // inside the phone screen during browser-backed UI and touch-target checks.
  devIndicators: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
