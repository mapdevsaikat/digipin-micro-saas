module.exports = {
  apps: [{
    name: 'digipin-api',
    script: 'dist/server.js',
    instances: 1,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};