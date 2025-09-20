module.exports = {
  apps: [{
    name: 'digipin-micro-saas',
    script: 'dist/server.js',
    instances: 1, // Single instance for 1GB RAM droplet
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '800M', // Restart if memory usage exceeds 800MB
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
      DATABASE_PATH: '/var/www/digipin-micro-saas/data/digipin.db',
      CACHE_TTL: '3600',
      LOG_LEVEL: 'info'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0',
      DATABASE_PATH: './data/digipin.db',
      CACHE_TTL: '1800',
      LOG_LEVEL: 'debug'
    },
    // Logging configuration
    log_file: '/var/log/pm2/digipin-micro-saas.log',
    out_file: '/var/log/pm2/digipin-micro-saas-out.log',
    error_file: '/var/log/pm2/digipin-micro-saas-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto-restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Health monitoring
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }],

  deploy: {
    production: {
      user: 'root',
      host: ['YOUR_DROPLET_IP'], // Replace with your DigitalOcean droplet IP
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/digipin-micro-saas.git', // Replace with your repo
      path: '/var/www/digipin-micro-saas',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'apt update && apt install -y nodejs npm git',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
