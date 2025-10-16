import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      { source: "/deal", destination: "/" },
      { source: "/hot-promo", destination: "/" },
      // Support encoded space variant for consistency
      { source: "/code%20promo", destination: "/" },
      { source: "/produk", destination: "/" },
      { source: "/kenyamanan", destination: "/" },
      { source: "/notifikasi", destination: "/" },
      { source: "/detail", destination: "/" },
    ];
  },
};

export default nextConfig;
