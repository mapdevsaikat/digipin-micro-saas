# 🌐 QuantaRoute.com - Dual Product Setup Guide

## 🎯 Vision: Unified Geospatial Platform

**QuantaRoute.com** will serve as your comprehensive geospatial platform featuring:
- **Routing Engine**: Advanced routing using OpenStreetMap + SSSPA algorithm
- **DigiPin Micro-SaaS**: India Post DigiPin geocoding services

## 🏗️ Architecture Overview

### Domain Structure
```
quantaroute.com/
├── /                    # Landing page (showcase both products)
├── /routing/            # Routing solution frontend
├── /digipin/            # DigiPin service frontend  
├── /api/routing/        # Routing API endpoints
├── /api/digipin/        # DigiPin API endpoints
├── /docs/               # Combined API documentation
├── /auth/               # Unified authentication system
├── /dashboard/          # User dashboard (both services)
├── /pricing/            # Combined pricing plans
├── /waitlist/           # Pre-launch waitlist
└── /about/              # About the platform
```

### Service Architecture
```
┌─────────────────────────────────────────┐
│              Nginx (Port 80/443)        │
│              quantaroute.com            │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│Frontend │  │ Routing  │  │ DigiPin  │
│(Static) │  │ Service  │  │ Service  │
│Port 80  │  │Port 4000 │  │Port 3000 │
└─────────┘  └──────────┘  └──────────┘
```

## 📋 Phase 1: Landing Page & Waitlist (Week 1)

### 1.1 Landing Page Design
Create a modern, conversion-focused landing page showcasing both products:

**Hero Section:**
- "Advanced Geospatial Solutions for Modern Applications"
- Highlight both routing and DigiPin capabilities
- Clear CTAs for each product

**Product Showcase:**
```
┌─────────────────┬─────────────────┐
│   🗺️ Routing    │   📍 DigiPin    │
│                 │                 │
│ • SSSPA Algo    │ • India Post    │
│ • OSM Data      │ • Geocoding     │
│ • Fast Routes   │ • Validation    │
│ • Developer API │ • Micro-SaaS    │
└─────────────────┴─────────────────┘
```

**Waitlist Form:**
- Email capture
- Product interest (Routing/DigiPin/Both)
- Use case description
- Company/individual selector

### 1.2 Technology Stack for Landing Page
```javascript
// Recommended: Next.js + Tailwind CSS + Framer Motion
// Alternative: React + Vite + Tailwind CSS

Frontend Stack:
├── Next.js 14 (App Router)
├── Tailwind CSS (Styling)
├── Framer Motion (Animations)
├── React Hook Form (Forms)
├── Zod (Validation)
└── Vercel/Netlify (Hosting)
```

## 📋 Phase 2: User Management System (Week 2)

### 2.1 Database Schema
```sql
-- Users table (unified for both products)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    company VARCHAR(255),
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waitlist table
CREATE TABLE waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    company VARCHAR(255),
    product_interest VARCHAR(50), -- 'routing', 'digipin', 'both'
    use_case TEXT,
    priority_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'invited', 'registered'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions (for both products)
CREATE TABLE user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    product VARCHAR(50), -- 'routing', 'digipin'
    plan VARCHAR(50), -- 'free', 'paid', 'enterprise'
    api_key_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys (unified for both products)
CREATE TABLE api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(50),
    product VARCHAR(50), -- 'routing', 'digipin', 'both'
    tier VARCHAR(50),
    monthly_limit INTEGER,
    current_usage INTEGER DEFAULT 0,
    usage_reset_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Authentication System
```javascript
// JWT-based authentication with refresh tokens
// Support for both products with unified login

Authentication Features:
├── Email/Password registration
├── Email verification
├── Password reset
├── JWT access tokens (15min)
├── Refresh tokens (7 days)
├── API key management
└── Role-based access
```

## 📋 Phase 3: Nginx Configuration (Week 2)

### 3.1 Complete Nginx Setup
```nginx
# /etc/nginx/sites-available/quantaroute.com
server {
    listen 80;
    server_name quantaroute.com www.quantaroute.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name quantaroute.com www.quantaroute.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/quantaroute.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quantaroute.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=main:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=1000r/m;

    # Main website (landing page)
    location / {
        proxy_pass http://localhost:8080; # Frontend app
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        limit_req zone=main burst=20 nodelay;
    }

    # DigiPin API
    location /api/digipin/ {
        rewrite ^/api/digipin/(.*) /v1/$1 break;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        limit_req zone=api burst=50 nodelay;
    }

    # Routing API
    location /api/routing/ {
        rewrite ^/api/routing/(.*) /v1/$1 break;
        proxy_pass http://localhost:4000; # Your routing service
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        limit_req zone=api burst=100 nodelay;
    }

    # DigiPin Documentation
    location /digipin/docs {
        rewrite ^/digipin/docs(.*) /docs$1 break;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health checks (no rate limiting)
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host $host;
        access_log off;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📋 Phase 4: Updated DigiPin Configuration

### 4.1 Update Server Configuration
```javascript
// Update src/server.ts for subdirectory hosting
fastify.register(swagger, {
  swagger: {
    info: {
      title: 'QuantaRoute DigiPin API',
      description: 'DigiPin geocoding services by QuantaRoute',
      version: '1.0.0'
    },
    host: 'quantaroute.com',
    basePath: '/api/digipin',
    schemes: ['https'],
    // ... rest of config
  }
});

fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  },
  // ... rest of config
});
```

### 4.2 Update API Routes
```javascript
// All routes should be prefixed with /v1
// Nginx will handle the /api/digipin/ to /v1/ rewriting
```

## 📋 Phase 5: Landing Page Implementation

### 5.1 Landing Page Wireframe
```
┌─────────────────────────────────────────────────┐
│                    HEADER                       │
│  QuantaRoute Logo    [Routing] [DigiPin] [Login]│
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│                     HERO                        │
│        Advanced Geospatial Solutions            │
│       for Modern Applications                   │
│                                                 │
│   [Join Waitlist] [View Documentation]         │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│                   PRODUCTS                      │
│  ┌──────────────────┬──────────────────────────┐ │
│  │   🗺️ Routing     │     📍 DigiPin          │ │
│  │                  │                          │ │
│  │ SSSPA Algorithm  │ India Post Integration   │ │
│  │ OpenStreetMap    │ Geocoding & Validation   │ │
│  │ Lightning Fast   │ Developer-Friendly API   │ │
│  │                  │                          │ │
│  │ [Learn More]     │ [Get API Key]           │ │
│  └──────────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│                  WAITLIST                       │
│         Be the first to access our APIs         │
│                                                 │
│  Email: [________________] [Join Waitlist]      │
└─────────────────────────────────────────────────┘
```

### 5.2 Waitlist Management Strategy
```javascript
// Waitlist prioritization algorithm
const calculatePriorityScore = (entry) => {
  let score = 0;
  
  // Company vs individual
  if (entry.company) score += 20;
  
  // Product interest
  if (entry.product_interest === 'both') score += 15;
  else if (entry.product_interest === 'routing') score += 10;
  else score += 5;
  
  // Use case complexity
  const useCase = entry.use_case.toLowerCase();
  if (useCase.includes('enterprise') || useCase.includes('scale')) score += 10;
  if (useCase.includes('api') || useCase.includes('integration')) score += 5;
  
  // Early signup bonus
  const daysFromLaunch = Math.floor((Date.now() - launchDate) / (1000 * 60 * 60 * 24));
  score += Math.max(0, 30 - daysFromLaunch);
  
  return score;
};
```

## 📋 Phase 6: Deployment Strategy

### 6.1 Service Deployment Plan
```bash
# Directory structure on server
/var/www/quantaroute.com/
├── frontend/          # Landing page (Next.js)
├── digipin-api/       # DigiPin service (port 3000)
├── routing-api/       # Routing service (port 4000)
├── auth-service/      # Authentication service (port 5000)
└── shared/
    ├── database/      # Shared SQLite database
    └── uploads/       # File uploads
```

### 6.2 PM2 Ecosystem Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'quantaroute-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/quantaroute.com/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    },
    {
      name: 'digipin-api',
      script: 'dist/server.js',
      cwd: '/var/www/quantaroute.com/digipin-api',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'routing-api',
      script: 'dist/server.js',
      cwd: '/var/www/quantaroute.com/routing-api',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
```

## 🎯 Marketing Strategy

### 6.1 Target Audiences
**Routing Service:**
- Logistics companies
- Delivery apps
- Fleet management
- Travel applications

**DigiPin Service:**
- E-commerce platforms
- Fintech companies
- Government applications
- Location-based services

### 6.2 Pricing Strategy
```
┌─────────────┬──────────────┬─────────────────┐
│    Plan     │   Routing    │    DigiPin      │
├─────────────┼──────────────┼─────────────────┤
│ Free        │ 1K req/month │ 1K req/month    │
│ Starter     │ 10K req/month│ 10K req/month   │
│ Professional│ 100K req/month│ 100K req/month │
│ Enterprise  │ Unlimited    │ Unlimited       │
└─────────────┴──────────────┴─────────────────┘

Bundle Discounts:
- Both services: 20% off
- Annual payment: 15% off
- Enterprise: Custom pricing
```

## 🚀 Implementation Timeline

**Week 1: Foundation**
- [ ] Domain setup and DNS configuration
- [ ] Landing page development (Next.js)
- [ ] Waitlist system implementation
- [ ] Basic email collection

**Week 2: Infrastructure**
- [ ] Digital Ocean droplet setup
- [ ] Nginx configuration
- [ ] SSL certificate installation
- [ ] DigiPin API deployment with subdirectory support

**Week 3: User Management**
- [ ] Authentication system
- [ ] User dashboard
- [ ] API key management
- [ ] Billing integration (Stripe)

**Week 4: Launch Preparation**
- [ ] Documentation site
- [ ] Testing and QA
- [ ] SEO optimization
- [ ] Marketing campaign launch

Would you like me to start with any specific phase? I recommend beginning with the landing page and waitlist system since you just bought the domain. This will help you start capturing interested users immediately while you build out the technical infrastructure.

What's your preference for the tech stack for the landing page? I'd recommend Next.js for its SEO benefits and ease of deployment.
