// Supabase deployment configuration

const supabaseConfig = {
  // Project settings
  projectName: 'omnidash-frontend',
  
  // Build configuration
  buildCommand: 'npm run build',
  outputDirectory: '.next',
  installCommand: 'npm install',
  
  // Environment variables required for production
  environmentVariables: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'ABR_API_KEY'
  ],
  
  // Next.js specific configuration
  framework: 'nextjs',
  nodeVersion: '18.x',
  
  // Custom headers for better security
  headers: [
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
        }
      ]
    }
  ]
};

module.exports = supabaseConfig;