# PM2 Setup Script for OmniDash (Windows)
# This script installs and configures PM2 for production deployment on Windows

Write-Host "🚀 Setting up PM2 for OmniDash..." -ForegroundColor Green

# 1. Install PM2 globally
Write-Host "📦 Installing PM2 globally..." -ForegroundColor Yellow
npm install -g pm2
npm install -g pm2-windows-startup

# 2. Install PM2 log rotation module
Write-Host "📊 Installing PM2 log rotation..." -ForegroundColor Yellow
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# 3. Create logs directories
Write-Host "📁 Creating log directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path logs
New-Item -ItemType Directory -Force -Path omnidash-frontend\logs
New-Item -ItemType Directory -Force -Path omnidash-backend\logs

# 4. Set up PM2 startup script for Windows
Write-Host "🔧 Setting up PM2 startup script for Windows..." -ForegroundColor Yellow
pm2-startup install

# 5. Load environment variables based on NODE_ENV
$env = $env:NODE_ENV
if ($env -eq "production") {
    Write-Host "🏭 Loading production environment..." -ForegroundColor Cyan
    Copy-Item .env.production .env -Force
} else {
    Write-Host "🔨 Loading development environment..." -ForegroundColor Cyan
    Copy-Item .env.development .env -Force
    $env = "development"
}

# 6. Start the applications
Write-Host "🎯 Starting applications with PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.js --env $env

# 7. Save PM2 configuration
Write-Host "💾 Saving PM2 configuration..." -ForegroundColor Yellow
pm2 save

# 8. Display PM2 status
Write-Host "✅ PM2 setup complete! Current status:" -ForegroundColor Green
pm2 status

Write-Host ""
Write-Host "📌 Useful PM2 commands:" -ForegroundColor Cyan
Write-Host "  pm2 status          - Show application status"
Write-Host "  pm2 logs            - View logs"
Write-Host "  pm2 restart all     - Restart all applications"
Write-Host "  pm2 reload all      - Zero-downtime reload"
Write-Host "  pm2 monit           - Monitor CPU and memory"
Write-Host "  pm2 stop all        - Stop all applications"
Write-Host "  pm2 delete all      - Remove all applications from PM2"
Write-Host ""
Write-Host "🌐 Web monitoring: pm2 web (opens browser dashboard)" -ForegroundColor Green