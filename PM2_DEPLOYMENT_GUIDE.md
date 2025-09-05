# PM2 Deployment Guide for OmniDash

## Quick Start

### Windows
```powershell
.\setup-pm2.ps1
```

### Linux/Mac
```bash
chmod +x setup-pm2.sh
./setup-pm2.sh
```

## Manual Installation

### 1. Install PM2 Globally
```bash
npm install -g pm2
```

### 2. Create Required Directories
```bash
mkdir -p logs omnidash-frontend/logs omnidash-backend/logs
```

### 3. Configure Environment
Choose your environment file:
- Development: Copy `.env.development` to `.env`
- Production: Copy `.env.production` to `.env`

### 4. Start Applications
```bash
# Development
pm2 start ecosystem.config.js

# Production
pm2 start ecosystem.config.js --env production
```

### 5. Save PM2 Configuration
```bash
pm2 save
pm2 startup
```

## Environment Variables

### Required for Production
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string  
- `JWT_SECRET` - Secret key for JWT tokens
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret

### Database Setup
```sql
-- Create database
CREATE DATABASE omnidash_prod;

-- Create user
CREATE USER omnidash_user WITH ENCRYPTED PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE omnidash_prod TO omnidash_user;
```

## PM2 Commands

### Process Management
```bash
pm2 status              # View all processes
pm2 start <app>         # Start application
pm2 stop <app>          # Stop application
pm2 restart <app>       # Restart application
pm2 reload <app>        # Zero-downtime reload
pm2 delete <app>        # Remove from PM2
```

### Monitoring
```bash
pm2 monit               # Real-time monitoring
pm2 logs                # View all logs
pm2 logs <app>          # View specific app logs
pm2 web                 # Web dashboard (port 9615)
```

### Cluster Management
```bash
pm2 scale <app> 4       # Scale to 4 instances
pm2 scale <app> +2      # Add 2 more instances
```

## Production Deployment

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
sudo apt-get install -y postgresql redis nginx
```

### 2. Deploy with PM2
```bash
# Clone repository
git clone <your-repo-url>
cd omnidash

# Install dependencies
npm install --prefix omnidash-frontend
npm install --prefix omnidash-backend

# Build frontend
npm run build --prefix omnidash-frontend

# Start with PM2
pm2 start ecosystem.config.js --env production
```

### 3. Nginx Configuration
```nginx
server {
    listen 80;
    server_name omnidash.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL Setup with Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d omnidash.com
```

## Monitoring & Logs

### Log Rotation
PM2 automatically rotates logs with pm2-logrotate:
- Max size: 10MB per file
- Retention: 7 days
- Compression: Enabled
- Daily rotation at midnight

### View Logs
```bash
# All logs
pm2 logs

# Specific app
pm2 logs omnidash-frontend
pm2 logs omnidash-backend

# Error logs only
pm2 logs --err

# Clear logs
pm2 flush
```

### Health Checks
```bash
# Check application health
curl http://localhost:3000/api/health
curl http://localhost:3001/health
```

## Troubleshooting

### Common Issues

1. **Port already in use**
```bash
pm2 kill
sudo lsof -i :3000
sudo kill -9 <PID>
```

2. **Permission errors**
```bash
sudo chown -R $USER:$USER /path/to/omnidash
```

3. **Database connection failed**
- Check DATABASE_URL in .env
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Test connection: `psql -U omnidash_user -d omnidash_prod`

4. **Redis connection failed**
- Check REDIS_URL in .env
- Verify Redis is running: `sudo systemctl status redis`
- Test connection: `redis-cli ping`

## Backup & Recovery

### Database Backup
```bash
# Backup
pg_dump omnidash_prod > backup_$(date +%Y%m%d).sql

# Restore
psql omnidash_prod < backup_20240101.sql
```

### PM2 Process Backup
```bash
# Save current PM2 state
pm2 save

# Restore PM2 state
pm2 resurrect
```

## Performance Tuning

### PM2 Cluster Mode
The ecosystem.config.js automatically uses all CPU cores in production:
```javascript
instances: process.env.NODE_ENV === 'production' ? 'max' : 1
```

### Memory Limits
Applications restart if memory exceeds 2GB:
```javascript
max_memory_restart: '2G'
```

### Graceful Shutdown
Applications have 5 seconds to cleanup before forced shutdown:
```javascript
kill_timeout: 5000
```

## Security Best Practices

1. **Use strong secrets**
```bash
# Generate secure secrets
openssl rand -base64 32
```

2. **Restrict file permissions**
```bash
chmod 600 .env.production
chmod 755 ecosystem.config.js
```

3. **Enable firewall**
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

4. **Regular updates**
```bash
npm audit fix
pm2 update
```

## Support

For issues or questions:
- Check logs: `pm2 logs`
- Monitor resources: `pm2 monit`
- View status: `pm2 status`
- GitHub Issues: [your-repo/issues]