import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      'http://6000-firebase-studio-1746589873145.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
      'https://6000-firebase-studio-1746589873145.cluster-iktsryn7xnhpexlu6255bftka4.cloudworkstations.dev',
    ],
  },
};

export default nextConfig;
