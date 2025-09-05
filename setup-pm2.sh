#!/bin/bash

# PM2 Setup Script for OmniDash
# This script installs and configures PM2 for production deployment

echo "🚀 Setting up PM2 for OmniDash..."

# 1. Install PM2 globally
echo "📦 Installing PM2 globally..."
npm install -g pm2

# 2. Install PM2 log rotation module
echo "📊 Installing PM2 log rotation..."
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# 3. Create logs directories
echo "📁 Creating log directories..."
mkdir -p logs
mkdir -p omnidash-frontend/logs
mkdir -p omnidash-backend/logs

# 4. Set up PM2 startup script
echo "🔧 Setting up PM2 startup script..."
pm2 startup

# 5. Load environment variables based on NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 Loading production environment..."
    cp .env.production .env
else
    echo "🔨 Loading development environment..."
    cp .env.development .env
fi

# 6. Start the applications
echo "🎯 Starting applications with PM2..."
pm2 start ecosystem.config.js --env $NODE_ENV

# 7. Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# 8. Display PM2 status
echo "✅ PM2 setup complete! Current status:"
pm2 status

echo ""
echo "📌 Useful PM2 commands:"
echo "  pm2 status          - Show application status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart all applications"
echo "  pm2 reload all      - Zero-downtime reload"
echo "  pm2 monit           - Monitor CPU and memory"
echo "  pm2 stop all        - Stop all applications"
echo "  pm2 delete all      - Remove all applications from PM2"
echo ""
echo "🌐 Web monitoring available at: pm2 web"