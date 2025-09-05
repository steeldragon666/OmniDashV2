module.exports = {
  apps: [
    {
      name: 'omnidash-backend',
      script: 'dist/server.js',
      cwd: './omnidash-backend',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        DATABASE_URL: 'postgresql://omnidash:omnidash_dev_password@localhost:5432/omnidash',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'your-jwt-secret-key',
        FRONTEND_URL: 'http://localhost:3000',
        LOG_LEVEL: 'debug'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        FRONTEND_URL: process.env.FRONTEND_URL,
        LOG_LEVEL: 'info'
      },
      watch: false,
      max_memory_restart: '2G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true
    },
    {
      name: 'omnidash-frontend',
      script: 'server.js',
      cwd: './omnidash-frontend',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXTAUTH_SECRET: 'your-nextauth-secret',
        CORS_ORIGIN: 'http://localhost:3001'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        CORS_ORIGIN: process.env.CORS_ORIGIN
      },
      watch: false,
      max_memory_restart: '2G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true
    }
  ],
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/omnidash.git',
      path: '/var/www/omnidash',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};