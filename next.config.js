/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to successfully complete even if
    // there are ESLint errors. Useful while iterating.
    ignoreDuringBuilds: true,
  },
  images: {
    // Izinkan gambar dari Supabase Storage (public dan signed URLs)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vtwooclhjobgdgvljauq.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
    // Atau bisa pakai opsi sederhana berikut (pilih salah satu pendekatan):
    // domains: ['vtwooclhjobgdgvljauq.supabase.co'],
  },
};

module.exports = nextConfig;
