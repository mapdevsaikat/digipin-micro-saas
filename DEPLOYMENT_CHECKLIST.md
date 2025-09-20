# 🚀 DigiPin Micro-SaaS Deployment Checklist

## ✅ Pre-Deployment Testing (Completed)

- [x] **Database Setup**: SQLite database created and migrations applied
- [x] **API Endpoints**: All endpoints tested and working
  - [x] Health check (`/health`)
  - [x] Root endpoint (`/`)
  - [x] Geocoding (`/v1/geocode`)
  - [x] Reverse geocoding (`/v1/reverse`)
  - [x] Batch processing (`/v1/batch`)
  - [x] Validation (`/v1/validate`)
  - [x] Usage tracking (`/v1/usage`)
- [x] **Authentication**: API key authentication working
- [x] **Rate Limiting**: Tier-based rate limiting functional
- [x] **Documentation**: Swagger UI accessible at `/docs`
- [x] **Production Build**: TypeScript compilation successful
- [x] **Production Server**: Server starts and runs in production mode

## 📋 Digital Ocean Deployment Steps

### 1. Server Setup
- [ ] Create Digital Ocean droplet (Ubuntu 22.04 LTS)
- [ ] SSH into server
- [ ] Update system packages
- [ ] Install Node.js 18.x
- [ ] Install PM2, Nginx, SQLite3, Git
- [ ] Configure firewall (UFW)
- [ ] Create non-root user (optional but recommended)

### 2. Application Deployment
- [ ] Clone repository to server
- [ ] Install dependencies (`npm install`)
- [ ] Build application (`npm run build`)
- [ ] Create production directories
- [ ] Copy files to `/var/www/digipin-micro-saas/`

### 3. Configuration
- [ ] Update `config/production.env` with secure values:
  - [ ] Change `JWT_SECRET` 
  - [ ] Change `API_ENCRYPTION_KEY`
  - [ ] Set correct `DATABASE_PATH`
- [ ] Update `ecosystem.config.js` with your server IP and repo URL
- [ ] Set environment to production

### 4. Database & Application Start
- [ ] Initialize database (migrations run automatically)
- [ ] Start application with PM2
- [ ] Configure PM2 for auto-restart
- [ ] Save PM2 configuration
- [ ] Test API endpoints locally

### 5. Nginx Configuration
- [ ] Create Nginx site configuration
- [ ] Enable site and disable default
- [ ] Test Nginx configuration
- [ ] Restart Nginx service

### 6. SSL Certificate (Optional but Recommended)
- [ ] Install Certbot
- [ ] Obtain SSL certificate for domain
- [ ] Configure auto-renewal

### 7. Monitoring & Maintenance
- [ ] Setup log rotation
- [ ] Create database backup script
- [ ] Configure cron jobs for backups
- [ ] Test monitoring commands

### 8. Final Testing
- [ ] Test all API endpoints via public URL
- [ ] Verify SSL certificate (if configured)
- [ ] Check documentation accessibility
- [ ] Monitor performance and logs

## 🔑 Default Test API Keys

**Important**: These are for testing only. Generate new keys for production!

| Tier | API Key | Monthly Limit |
|------|---------|---------------|
| Free | `free_test_key_hash_12345` | 1,000 requests |
| Paid | `paid_test_key_hash_67890` | 10,000 requests |
| Enterprise | `enterprise_test_key_hash_11111` | Unlimited |

## 📊 Test Commands

### Health Check
```bash
curl https://YOUR_DOMAIN/health
```

### Geocoding Test
```bash
curl -X POST https://YOUR_DOMAIN/v1/geocode \
  -H "Content-Type: application/json" \
  -H "x-api-key: free_test_key_hash_12345" \
  -d '{"address": "123 Main Street, New Delhi, India"}'
```

### Usage Check
```bash
curl -H "x-api-key: free_test_key_hash_12345" \
  https://YOUR_DOMAIN/v1/usage
```

### Documentation
```bash
# Should return HTML
curl https://YOUR_DOMAIN/docs
```

## 🔧 Troubleshooting Commands

### Check PM2 Status
```bash
pm2 status
pm2 logs digipin-micro-saas
```

### Check Nginx
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Check Database
```bash
sqlite3 /var/www/digipin-micro-saas/data/digipin.db ".tables"
sqlite3 /var/www/digipin-micro-saas/data/digipin.db "SELECT COUNT(*) FROM api_keys;"
```

### Check Disk Space
```bash
df -h
du -sh /var/www/digipin-micro-saas/
```

## 🎯 Post-Deployment Tasks

- [ ] Update DNS records to point to your droplet IP
- [ ] Test API with client applications
- [ ] Monitor server resources (CPU, RAM, disk)
- [ ] Setup monitoring alerts (optional)
- [ ] Document API endpoints for your users
- [ ] Plan for scaling if needed

## 📞 Support Resources

- **Logs Location**: `/var/log/pm2/digipin-micro-saas*.log`
- **Database Location**: `/var/www/digipin-micro-saas/data/digipin.db`
- **Application Directory**: `/var/www/digipin-micro-saas/`
- **Nginx Config**: `/etc/nginx/sites-available/digipin-api`

## 🎉 Success Criteria

Your deployment is successful when:
1. All API endpoints return expected responses
2. Authentication works with test API keys
3. Swagger documentation is accessible
4. SSL certificate is valid (if configured)
5. PM2 shows the app as "online"
6. Nginx serves the application without errors

**Your DigiPin micro-SaaS is ready for production! 🚀**
