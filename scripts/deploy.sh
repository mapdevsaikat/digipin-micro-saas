#!/bin/bash

# DigiPin Micro-SaaS Deployment Script
# For DigitalOcean Ubuntu 22.04 Droplet

set -e  # Exit on any error

echo "🚀 Starting DigiPin Micro-SaaS Deployment"
echo "=========================================="

# Configuration
APP_NAME="digipin-micro-saas"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="your-domain.com"  # Change this to your domain
EMAIL="your-email@example.com"  # Change this to your email

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run this script as root (use sudo)"
    exit 1
fi

# Update system packages
log_info "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
log_info "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PM2 globally
log_info "Installing PM2..."
npm install -g pm2

# Install Nginx
log_info "Installing Nginx..."
apt install -y nginx

# Install Certbot for SSL
log_info "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Create application directory
log_info "Creating application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/data
mkdir -p /var/log/pm2

# Create application user
log_info "Creating application user..."
if ! id -u $APP_NAME >/dev/null 2>&1; then
    useradd -r -s /bin/false $APP_NAME
fi

# Set up firewall
log_info "Configuring UFW firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

# Clone repository (you'll need to replace this with your actual repo)
log_info "Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
    log_info "Repository already exists, pulling latest changes..."
    cd $APP_DIR && git pull
else
    log_warn "Please clone your repository manually to $APP_DIR"
    log_warn "git clone https://github.com/yourusername/digipin-micro-saas.git $APP_DIR"
fi

# Set correct permissions
log_info "Setting permissions..."
chown -R $APP_NAME:$APP_NAME $APP_DIR
chmod -R 755 $APP_DIR

# Install application dependencies (if repository is cloned)
if [ -f "$APP_DIR/package.json" ]; then
    log_info "Installing application dependencies..."
    cd $APP_DIR
    npm install --production
    npm run build
fi

# Configure Nginx
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint (bypass rate limiting)
    location /health {
        limit_req off;
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
log_info "Testing Nginx configuration..."
nginx -t

# Restart Nginx
log_info "Restarting Nginx..."
systemctl restart nginx
systemctl enable nginx

# Start the application with PM2 (if built)
if [ -f "$APP_DIR/dist/server.js" ]; then
    log_info "Starting application with PM2..."
    cd $APP_DIR
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
fi

# Configure SSL with Let's Encrypt
log_info "Configuring SSL certificate..."
log_warn "Make sure your domain $DOMAIN points to this server's IP before running the next command"
read -p "Press Enter to continue with SSL setup, or Ctrl+C to cancel..."

certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL

# Set up automatic certificate renewal
log_info "Setting up automatic certificate renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Set up log rotation
log_info "Setting up log rotation..."
cat > /etc/logrotate.d/$APP_NAME << EOF
/var/log/pm2/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0640 $APP_NAME $APP_NAME
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create monitoring script
log_info "Creating monitoring script..."
cat > /usr/local/bin/digipin-health-check.sh << 'EOF'
#!/bin/bash

# Health check script for DigiPin Micro-SaaS
HEALTH_URL="http://localhost:3000/health"
EMAIL="your-email@example.com"  # Change this

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response != "200" ]; then
    echo "DigiPin API is down! HTTP status: $response" | mail -s "DigiPin API Alert" $EMAIL
    pm2 restart digipin-micro-saas
fi
EOF

chmod +x /usr/local/bin/digipin-health-check.sh

# Add health check to cron (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/digipin-health-check.sh") | crontab -

# Display final information
echo ""
log_info "🎉 Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update your domain DNS to point to this server's IP"
echo "2. Clone your repository to $APP_DIR"
echo "3. Update the configuration in $APP_DIR/config/production.env"
echo "4. Run: cd $APP_DIR && npm install && npm run build"
echo "5. Start the app: pm2 start ecosystem.config.js --env production"
echo ""
echo "Useful commands:"
echo "- View logs: pm2 logs $APP_NAME"
echo "- Restart app: pm2 restart $APP_NAME"
echo "- Monitor: pm2 monit"
echo "- Check status: pm2 status"
echo ""
echo "Your API will be available at: https://$DOMAIN"
echo "API documentation: https://$DOMAIN/docs"
echo ""
log_info "Deployment script completed! 🚀"
