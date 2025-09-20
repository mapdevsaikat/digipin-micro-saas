#!/bin/bash

# QuantaRoute.com Deployment Script
# This script deploys the DigiPin API as part of the QuantaRoute platform

set -e

echo "🚀 Deploying DigiPin API to QuantaRoute.com"
echo "============================================"

# Configuration
DOMAIN="quantaroute.com"
PROJECT_DIR="/var/www/quantaroute.com"
DIGIPIN_DIR="$PROJECT_DIR/digipin-api"
NGINX_CONF="/etc/nginx/sites-available/quantaroute.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. Consider using a non-root user for application deployment."
fi

# Step 1: Create directory structure
print_status "Creating directory structure..."
sudo mkdir -p $PROJECT_DIR/{digipin-api,frontend,shared/database,logs}
sudo chown -R $USER:$USER $PROJECT_DIR

# Step 2: Deploy DigiPin API
print_status "Deploying DigiPin API..."
if [ -d "$DIGIPIN_DIR" ]; then
    cd $DIGIPIN_DIR
    git pull origin main
else
    git clone https://github.com/YOUR_USERNAME/digipin-micro-saas.git $DIGIPIN_DIR
    cd $DIGIPIN_DIR
fi

# Step 3: Install dependencies and build
print_status "Installing dependencies..."
npm install

print_status "Building application..."
npm run build

# Step 4: Configure environment
print_status "Configuring production environment..."
if [ ! -f "config/production.env" ]; then
    print_error "Production environment file not found!"
    print_warning "Please create config/production.env with your production settings"
    exit 1
fi

# Update production config for QuantaRoute
cat > config/production.env << EOF
# Production Environment Configuration for QuantaRoute.com
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DATABASE_PATH=$PROJECT_DIR/shared/database/digipin.db

# Cache Configuration
CACHE_TTL=3600

# API Configuration
API_KEY_LENGTH=32
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=60000

# Logging
LOG_LEVEL=info

# Security - CHANGE THESE IN PRODUCTION!
JWT_SECRET=$(openssl rand -base64 32)
API_ENCRYPTION_KEY=$(openssl rand -base64 32)
EOF

# Step 5: Setup database
print_status "Setting up database..."
mkdir -p $PROJECT_DIR/shared/database
export NODE_ENV=production
export DATABASE_PATH=$PROJECT_DIR/shared/database/digipin.db

# Run migrations
node -e "
const DatabaseConnection = require('./dist/database/connection').default;
const db = DatabaseConnection.getInstance();
db.runMigrations().then(() => {
    console.log('✅ Database migrations completed');
    process.exit(0);
}).catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
"

# Step 6: Configure PM2
print_status "Configuring PM2..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'quantaroute-digipin-api',
    script: 'dist/server.js',
    cwd: '$DIGIPIN_DIR',
    instances: 1,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '800M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
      DATABASE_PATH: '$PROJECT_DIR/shared/database/digipin.db',
      CACHE_TTL: '3600',
      LOG_LEVEL: 'info'
    },
    log_file: '$PROJECT_DIR/logs/digipin-api.log',
    out_file: '$PROJECT_DIR/logs/digipin-api-out.log',
    error_file: '$PROJECT_DIR/logs/digipin-api-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Step 7: Start/Restart PM2
print_status "Starting DigiPin API service..."
pm2 delete quantaroute-digipin-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Step 8: Configure Nginx
print_status "Configuring Nginx..."
if [ -f "../nginx-quantaroute.conf" ]; then
    sudo cp ../nginx-quantaroute.conf $NGINX_CONF
else
    print_warning "Nginx configuration file not found. Please manually configure Nginx."
fi

# Test Nginx configuration
if sudo nginx -t; then
    print_status "Nginx configuration is valid"
    sudo systemctl reload nginx
else
    print_error "Nginx configuration has errors. Please fix them before continuing."
    exit 1
fi

# Step 9: Setup SSL (if not already configured)
print_status "Setting up SSL certificate..."
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_warning "SSL certificate not found. Setting up Let's Encrypt..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
else
    print_status "SSL certificate already exists"
fi

# Step 10: Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/quantaroute-digipin << EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 0644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Step 11: Setup backup script
print_status "Setting up backup script..."
cat > $PROJECT_DIR/backup-digipin.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_DIR/backups"
mkdir -p \$BACKUP_DIR

# Backup database
sqlite3 $PROJECT_DIR/shared/database/digipin.db ".backup \$BACKUP_DIR/digipin_\$DATE.db"

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "digipin_*.db" -mtime +7 -delete

echo "Backup completed: digipin_\$DATE.db"
EOF

chmod +x $PROJECT_DIR/backup-digipin.sh

# Add to crontab if not already present
if ! crontab -l 2>/dev/null | grep -q "backup-digipin.sh"; then
    (crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_DIR/backup-digipin.sh") | crontab -
    print_status "Backup cron job added"
fi

# Step 12: Final tests
print_status "Running final tests..."
sleep 5

# Test health endpoint
if curl -f -s http://localhost:3000/health > /dev/null; then
    print_status "✅ DigiPin API health check passed"
else
    print_error "❌ DigiPin API health check failed"
    pm2 logs quantaroute-digipin-api --lines 20
    exit 1
fi

# Test via Nginx
if curl -f -s https://$DOMAIN/api/digipin/health > /dev/null; then
    print_status "✅ Nginx proxy test passed"
else
    print_warning "⚠️ Nginx proxy test failed - check configuration"
fi

# Display status
print_status "Deployment completed! 🎉"
echo ""
echo "📊 Service Status:"
pm2 status quantaroute-digipin-api
echo ""
echo "🌐 API Endpoints:"
echo "  • Health: https://$DOMAIN/api/digipin/health"
echo "  • Root: https://$DOMAIN/digipin/"
echo "  • Docs: https://$DOMAIN/digipin/docs"
echo "  • Geocode: https://$DOMAIN/api/digipin/geocode"
echo ""
echo "🔧 Management Commands:"
echo "  • View logs: pm2 logs quantaroute-digipin-api"
echo "  • Restart: pm2 restart quantaroute-digipin-api"
echo "  • Monitor: pm2 monit"
echo "  • Backup: $PROJECT_DIR/backup-digipin.sh"
echo ""
echo "📝 Next Steps:"
echo "  1. Update your GitHub repo URL in this script"
echo "  2. Test all API endpoints with your API keys"
echo "  3. Set up monitoring and alerts"
echo "  4. Configure your frontend application"
echo ""
print_status "QuantaRoute DigiPin API is now live! 🚀"
EOF
