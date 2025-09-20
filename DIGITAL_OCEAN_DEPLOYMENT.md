# DigiPin Micro-SaaS - Digital Ocean Deployment Guide

This guide will walk you through deploying your DigiPin micro-SaaS API to Digital Ocean.

## 🚀 Quick Summary - Final Test Results

✅ **All tests passed successfully!**

- Health endpoint: Working
- Root endpoint: Working  
- Geocoding endpoint: Working
- Reverse geocoding: Working
- Batch processing: Working
- Validation endpoint: Working
- Usage tracking: Working
- API key authentication: Working
- Rate limiting: Working
- Swagger documentation: Working
- Production build: Working

## 📋 Prerequisites

1. Digital Ocean account
2. Domain name (optional but recommended)
3. SSH key pair
4. Git repository with your code

## 🔧 Step 1: Create Digital Ocean Droplet

### Option A: Basic Droplet (Recommended for testing)
1. Log into your Digital Ocean dashboard
2. Click "Create" → "Droplets"
3. Choose these settings:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($6/month - 1GB RAM, 1 vCPU, 25GB SSD)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH Key (upload your public key)
   - **Hostname**: `digipin-api` or similar

### Option B: Production Droplet (For higher traffic)
- **Plan**: Basic ($12/month - 2GB RAM, 1 vCPU, 50GB SSD)

## 🔐 Step 2: Initial Server Setup

### Connect to your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

### Update the system:
```bash
apt update && apt upgrade -y
```

### Install required packages:
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PM2, Nginx, and other tools
npm install -g pm2
apt install -y nginx sqlite3 ufw git curl

# Verify installations
node --version
npm --version
pm2 --version
```

## 🔒 Step 3: Security Setup

### Configure firewall:
```bash
# Allow SSH, HTTP, and HTTPS
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
ufw status
```

### Create a non-root user (recommended):
```bash
# Create user
adduser digipin
usermod -aG sudo digipin

# Copy SSH keys
mkdir -p /home/digipin/.ssh
cp /root/.ssh/authorized_keys /home/digipin/.ssh/
chown -R digipin:digipin /home/digipin/.ssh
chmod 700 /home/digipin/.ssh
chmod 600 /home/digipin/.ssh/authorized_keys
```

## 📂 Step 4: Deploy Application

### Switch to the application user:
```bash
su - digipin
```

### Clone your repository:
```bash
# Replace with your actual repository URL
git clone https://github.com/YOUR_USERNAME/digipin-micro-saas.git
cd digipin-micro-saas
```

### Install dependencies and build:
```bash
npm install
npm run build
```

### Create production directories:
```bash
sudo mkdir -p /var/www/digipin-micro-saas/data
sudo mkdir -p /var/log/pm2
sudo chown -R digipin:digipin /var/www/digipin-micro-saas
sudo chown -R digipin:digipin /var/log/pm2
```

### Copy files to production directory:
```bash
cp -r * /var/www/digipin-micro-saas/
cd /var/www/digipin-micro-saas
```

## ⚙️ Step 5: Configure Environment

### Update production configuration:
```bash
nano config/production.env
```

Update these critical values:
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_PATH=/var/www/digipin-micro-saas/data/digipin.db
CACHE_TTL=3600
LOG_LEVEL=info

# IMPORTANT: Change these security keys!
JWT_SECRET=your-super-secure-jwt-secret-32-chars-min
API_ENCRYPTION_KEY=your-super-secure-encryption-key-32
```

### Update PM2 ecosystem config:
```bash
nano ecosystem.config.js
```

Update the deployment section:
```javascript
deploy: {
  production: {
    user: 'digipin',
    host: ['YOUR_DROPLET_IP'], // Replace with your actual IP
    ref: 'origin/main',
    repo: 'https://github.com/YOUR_USERNAME/digipin-micro-saas.git',
    path: '/var/www/digipin-micro-saas',
    'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
    env: {
      NODE_ENV: 'production'
    }
  }
}
```

## 🚀 Step 6: Start the Application

### Initialize database and start app:
```bash
# Set production environment
export NODE_ENV=production

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

### Verify the application is running:
```bash
pm2 status
pm2 logs digipin-micro-saas

# Test the API
curl http://localhost:3000/health
```

## 🌐 Step 7: Configure Nginx Reverse Proxy

### Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/digipin-api
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # Health check endpoint (bypass rate limiting)
    location /health {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/digipin-api /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 🔐 Step 8: SSL Certificate (Recommended)

### Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

### Get SSL certificate:
```bash
sudo certbot --nginx -d YOUR_DOMAIN
```

### Setup auto-renewal:
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Step 9: Monitoring and Maintenance

### Setup log rotation:
```bash
sudo nano /etc/logrotate.d/pm2-digipin
```

Add:
```
/var/log/pm2/digipin-micro-saas*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 0644 digipin digipin
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Create backup script:
```bash
nano /home/digipin/backup-db.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/digipin/backups"
mkdir -p $BACKUP_DIR

# Backup database
sqlite3 /var/www/digipin-micro-saas/data/digipin.db ".backup $BACKUP_DIR/digipin_$DATE.db"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "digipin_*.db" -mtime +7 -delete

echo "Backup completed: digipin_$DATE.db"
```

Make it executable and add to cron:
```bash
chmod +x /home/digipin/backup-db.sh
crontab -e
# Add: 0 2 * * * /home/digipin/backup-db.sh
```

## 🧪 Step 10: Final Testing

### Test all endpoints:
```bash
# Health check
curl https://YOUR_DOMAIN/health

# API test
curl -X POST https://YOUR_DOMAIN/v1/geocode \
  -H "Content-Type: application/json" \
  -H "x-api-key: free_test_key_hash_12345" \
  -d '{"address": "123 Main Street, New Delhi"}'

# Documentation
curl https://YOUR_DOMAIN/docs
```

### Monitor performance:
```bash
pm2 monit
htop
df -h
```

## 🔧 Troubleshooting

### Common Issues:

1. **Port 3000 not accessible**:
   ```bash
   sudo netstat -tulpn | grep :3000
   pm2 logs digipin-micro-saas
   ```

2. **Database permission errors**:
   ```bash
   sudo chown -R digipin:digipin /var/www/digipin-micro-saas/data
   chmod 755 /var/www/digipin-micro-saas/data
   chmod 644 /var/www/digipin-micro-saas/data/digipin.db
   ```

3. **Nginx errors**:
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

4. **PM2 process not starting**:
   ```bash
   pm2 delete digipin-micro-saas
   pm2 start ecosystem.config.js --env production
   ```

## 📈 Production Optimizations

### For higher traffic:
1. **Upgrade droplet** to 2GB+ RAM
2. **Enable PM2 clustering**:
   ```javascript
   // In ecosystem.config.js
   instances: 'max', // or specific number
   exec_mode: 'cluster'
   ```

3. **Add Redis caching** (optional):
   ```bash
   sudo apt install redis-server
   # Update your application to use Redis
   ```

4. **Setup monitoring** with tools like:
   - PM2 Plus (monitoring dashboard)
   - Digital Ocean Monitoring
   - Custom health checks

## 🎉 Deployment Complete!

Your DigiPin micro-SaaS API is now live at:
- **API**: `https://YOUR_DOMAIN`
- **Documentation**: `https://YOUR_DOMAIN/docs`
- **Health Check**: `https://YOUR_DOMAIN/health`

### Next Steps:
1. Update your domain DNS to point to your droplet IP
2. Test all API endpoints with your production domain
3. Update any client applications to use the new API URL
4. Monitor logs and performance
5. Setup monitoring alerts

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs digipin-micro-saas`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify database permissions and connectivity
4. Test API endpoints manually with curl

Your DigiPin micro-SaaS is now production-ready! 🚀
