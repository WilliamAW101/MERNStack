import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    REMOTE_URL: process.env.REMOTE_URL,
  },
  images: {
    unoptimized: true, // Disable image optimization for faster loading
    // Image optimization causes slow initial load when images need to be processed
    // Better to serve images directly from your backend/CDN
  },
  // Enable HTTP/2 and compression
  compress: true,
  
  // Optimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Performance optimizations
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
