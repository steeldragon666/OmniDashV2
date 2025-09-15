/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker/Cloud Run deployment
  output: 'standalone',
  
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk', '@supabase/supabase-js', 'winston', 'winston-daily-rotate-file', 'jsonwebtoken', 'rate-limiter-flexible', '@google-cloud/bigquery', '@google-cloud/vertexai', '@google-cloud/storage']
  },
  
  // Webpack configuration to handle Node.js modules and optional dependencies
  webpack: (config, { isServer }) => {
    // Handle Node.js modules that shouldn't be bundled for client
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      process: false
    };
    
    // Ignore optional dependencies that may not be available
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('drizzle-orm');
    }
    
    // Ignore warnings for optional dependencies
    config.ignoreWarnings = [
      { module: /node_modules\/rate-limiter-flexible\/lib\/RateLimiterDrizzle\.js/ },
      { module: /drizzle-orm/ }
    ];
    
    return config;
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
      }
    ];
  },

  // Disable rewrites for production deployment
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: 'http://localhost:3000/api/:path*',
  //     },
  //   ];
  // },
};

module.exports = nextConfig;