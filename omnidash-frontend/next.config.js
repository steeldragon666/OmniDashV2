/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk', '@supabase/supabase-js']
  },

  // Image optimization
  images: {
    domains: [
      'mir-s3-cdn-cf.behance.net',
      'a5.behance.net',
      'localhost',
      'via.placeholder.com', 
      'images.unsplash.com'
    ],
    formats: ['image/webp', 'image/avif']
  },

  // Compression and performance
  compress: true,
  poweredByHeader: false,

  // Skip type checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Environment variables
  env: {
    CUSTOM_KEY: 'omnidash-production'
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },

  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true
      },
      {
        source: '/dashboard',
        destination: '/',
        permanent: true
      }
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;