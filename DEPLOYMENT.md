# DigiPin Micro-SaaS Deployment Guide

This guide will help you deploy your DigiPin Micro-SaaS to a DigitalOcean droplet for production use.

## Prerequisites

1. **DigitalOcean Account**: Sign up at [digitalocean.com](https://digitalocean.com)
2. **Domain Name**: Purchase a domain (e.g., from Namecheap, GoDaddy)
3. **GitHub Repository**: Push your code to GitHub
4. **Email Account**: For SSL certificate and monitoring alerts

## Step 1: Create DigitalOcean Droplet

1. **Create Droplet**:
   - Choose Ubuntu 22.04 LTS
   - Select $6/month plan (1GB RAM, 1 vCPU, 25GB SSD)
   - Add your SSH key
   - Choose a datacenter region close to your users (e.g., Bangalore for India)

2. **Note your droplet's IP address** (e.g., 164.90.xxx.xxx)

## Step 2: Configure Domain DNS

1. **Add DNS Records** in your domain registrar:
   ```
   Type: A
   Name: @
   Value: YOUR_DROPLET_IP
   TTL: 300

   Type: A  
   Name: www
   Value: YOUR_DROPLET_IP
   TTL: 300
   ```

2. **Wait for DNS propagation** (5-30 minutes)

## Step 3: Prepare Your Repository

1. **Push code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/digipin-micro-saas.git
   git push -u origin main
   ```

2. **Update configuration**:
   - Edit `ecosystem.config.js` - replace `YOUR_DROPLET_IP` with actual IP
   - Edit `scripts/deploy.sh` - replace `your-domain.com` and `your-email@example.com`

## Step 4: Deploy to Server

1. **SSH into your droplet**:
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```

2. **Clone your repository**:
   ```bash
   git clone https://github.com/yourusername/digipin-micro-saas.git /var/www/digipin-micro-saas
   cd /var/www/digipin-micro-saas
   ```

3. **Run deployment script**:
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

4. **Follow the prompts** and wait for deployment to complete

## Step 5: Configure Application

1. **Update production environment**:
   ```bash
   nano config/production.env
   ```
   
   Update the following values:
   ```bash
   JWT_SECRET=your-super-secret-32-character-key
   API_ENCRYPTION_KEY=another-32-character-secret-key
   ```

2. **Install dependencies and build**:
   ```bash
   cd /var/www/digipin-micro-saas
   npm install --production
   npm run build
   ```

3. **Start the application**:
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

## Step 6: Verify Deployment

1. **Check application status**:
   ```bash
   pm2 status
   pm2 logs digipin-micro-saas
   ```

2. **Test API endpoints**:
   ```bash
   curl https://your-domain.com/health
   curl https://your-domain.com/
   ```

3. **Visit your API documentation**:
   ```
   https://your-domain.com/docs
   ```

## Step 7: Set Up Monitoring

1. **Create cron jobs for monitoring**:
   ```bash
   crontab -e
   ```
   
   Add these lines:
   ```bash
   # Run health monitoring every 5 minutes
   */5 * * * * /var/www/digipin-micro-saas/scripts/monitor.sh > /dev/null 2>&1
   
   # Backup database daily at 2 AM
   0 2 * * * /var/www/digipin-micro-saas/scripts/backup.sh
   
   # Clean old logs weekly
   0 0 * * 0 find /var/log/pm2 -name "*.log" -mtime +7 -delete
   ```

2. **Test monitoring script**:
   ```bash
   cd /var/www/digipin-micro-saas
   ./scripts/monitor.sh
   ```

## Step 8: Configure API Keys

1. **Connect to database**:
   ```bash
   sqlite3 /var/www/digipin-micro-saas/data/digipin.db
   ```

2. **Create production API keys**:
   ```sql
   -- Create a paid tier API key
   INSERT INTO api_keys (key_hash, key_prefix, tier, monthly_limit, current_usage)
   VALUES ('prod_paid_key_hash_12345', 'prod_paid', 'paid', 50000, 0);
   
   -- Create an enterprise API key
   INSERT INTO api_keys (key_hash, key_prefix, tier, monthly_limit, current_usage)
   VALUES ('prod_enterprise_key_hash_67890', 'prod_ent', 'enterprise', 999999, 0);
   ```

3. **Exit database**:
   ```sql
   .quit
   ```

## Step 9: Security Hardening

1. **Update system packages**:
   ```bash
   apt update && apt upgrade -y
   ```

2. **Configure fail2ban** (optional):
   ```bash
   apt install fail2ban
   systemctl enable fail2ban
   systemctl start fail2ban
   ```

3. **Set up automatic security updates**:
   ```bash
   apt install unattended-upgrades
   dpkg-reconfigure -plow unattended-upgrades
   ```

## Step 10: Performance Optimization

1. **Enable Nginx caching**:
   ```bash
   nano /etc/nginx/sites-available/digipin-micro-saas
   ```
   
   Add caching configuration:
   ```nginx
   # Add to server block
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;
   
   # Add to location / block
   proxy_cache api_cache;
   proxy_cache_valid 200 5m;
   proxy_cache_key "$request_uri";
   ```

2. **Restart Nginx**:
   ```bash
   systemctl restart nginx
   ```

## Useful Commands

### PM2 Management
```bash
pm2 status                    # Check application status
pm2 logs digipin-micro-saas   # View logs
pm2 restart digipin-micro-saas # Restart application
pm2 reload digipin-micro-saas  # Zero-downtime restart
pm2 monit                     # Monitor resources
```

### Database Management
```bash
# Connect to database
sqlite3 /var/www/digipin-micro-saas/data/digipin.db

# Backup database
./scripts/backup.sh

# View API usage
sqlite3 /var/www/digipin-micro-saas/data/digipin.db "SELECT tier, COUNT(*) as count, SUM(current_usage) as total_usage FROM api_keys GROUP BY tier;"
```

### Log Management
```bash
# View application logs
pm2 logs digipin-micro-saas

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# View system logs
journalctl -u nginx -f
```

### SSL Certificate Management
```bash
# Renew SSL certificate
certbot renew

# Check certificate status
certbot certificates

# Test auto-renewal
certbot renew --dry-run
```

## Troubleshooting

### Application Won't Start
1. Check logs: `pm2 logs digipin-micro-saas`
2. Verify build: `npm run build`
3. Check permissions: `chown -R digipin-micro-saas:digipin-micro-saas /var/www/digipin-micro-saas`

### High Memory Usage
1. Monitor with: `pm2 monit`
2. Restart if needed: `pm2 restart digipin-micro-saas`
3. Check for memory leaks in logs

### Database Issues
1. Check integrity: `sqlite3 /path/to/db "PRAGMA integrity_check;"`
2. Restore from backup if needed
3. Check disk space: `df -h`

### SSL Certificate Issues
1. Check certificate: `certbot certificates`
2. Renew manually: `certbot renew`
3. Verify DNS records

## Monitoring and Alerts

### Key Metrics to Monitor
- API response times
- Error rates
- Database size
- Memory usage
- Disk space
- SSL certificate expiry

### Setting Up Alerts
Consider integrating with:
- **UptimeRobot**: For uptime monitoring
- **Sentry**: For error tracking
- **DataDog**: For comprehensive monitoring
- **Simple email alerts**: Using the monitoring script

## Cost Optimization

### Monthly Costs (Estimated)
- DigitalOcean Droplet: $6/month
- Domain: $10-15/year
- SSL Certificate: Free (Let's Encrypt)
- **Total**: ~$8/month

### Scaling Considerations
- **Vertical scaling**: Upgrade droplet size as needed
- **Horizontal scaling**: Add load balancer + multiple droplets
- **Database scaling**: Consider PostgreSQL for high loads
- **CDN**: Add Cloudflare for global performance

## Backup Strategy

### Automated Backups
- Daily database backups (retention: 30 days)
- Weekly full system backups
- Store backups off-site (cloud storage)

### Disaster Recovery
1. Keep infrastructure as code (this deployment guide)
2. Regular backup testing
3. Document recovery procedures
4. Monitor backup success

## Conclusion

Your DigiPin Micro-SaaS is now deployed and ready for production! 🎉

Remember to:
- Monitor performance regularly
- Keep dependencies updated
- Backup data frequently
- Scale resources as needed

For support, check the logs first, then refer to this guide. Good luck with your micro-SaaS! 🚀
