import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Service Worker は Turbopack ビルドとは独立して `serwist build` が生成する。
  // 設定は serwist.config.mjs を参照。
  turbopack: {},
};

export default nextConfig;
