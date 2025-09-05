#!/usr/bin/env node

/**
 * Production Build Script
 * Sets environment variables and builds the application
 */

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for build
process.env.NODE_ENV = 'production';
process.env.SKIP_ENV_VALIDATION = 'true'; // Skip validation during build
process.env.NEXT_TELEMETRY_DISABLED = '1'; // Disable telemetry

console.log('🔨 Building OmniDash for production...');
console.log('⚠️  Environment validation skipped for build');

// Run the build
const buildProcess = spawn('npm', ['run', 'build:next'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Set all required environment variables in production');
    console.log('2. Run security validation: npm run security:check');
    console.log('3. Deploy using your preferred platform');
    console.log('');
    console.log('Required environment variables for production:');
    console.log('- NEXTAUTH_SECRET (generate with: openssl rand -base64 32)');
    console.log('- ENCRYPTION_KEY (generate with: openssl rand -hex 32)');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    console.log('- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    console.log('- And other OAuth provider credentials as needed');
  } else {
    console.error('❌ Build failed with exit code:', code);
    process.exit(code);
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Build process error:', error.message);
  process.exit(1);
});