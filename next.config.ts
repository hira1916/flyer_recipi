import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
} as any);

const nextConfig = {
  /* その他の設定項目 */
  experimental: {
    turbopack: {},
  },
  allowedDevOrigins: [
    "192.168.10.108:3000",
    "192.168.10.108",
    "*.ngrok-free.dev",
    "symphony-tall-craftily.ngrok-free.dev"
  ],
};

export default withPWA(nextConfig as any);