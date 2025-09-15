
import type {NextConfig} from 'next';
import withPWA from 'next-pwa';

const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    allowedDevOrigins: [
      "https://9000-firebase-studio-1757361882116.cluster-ux5mmlia3zhhask7riihruxydo.cloudworkstations.dev",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

const pwaConfig = {
  dest: 'public',
  register: !isDevelopment,
  skipWaiting: !isDevelopment,
  disable: isDevelopment,
};

export default withPWA(pwaConfig)(nextConfig);
