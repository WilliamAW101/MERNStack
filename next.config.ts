import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    REMOTE_URL: process.env.REMOTE_URL,
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
