# Create a comprehensive Cursor AI context file for the DigiPin Micro-SaaS project

import json

# Create the project context structure for Cursor AI
cursor_context = {
    "project": {
        "name": "digipin-micro-saas",
        "description": "Ultra-frugal DigiPin geocoding API service for the Indian market",
        "version": "1.0.0",
        "type": "micro-saas-api",
        "target_market": "India",
        "business_model": "pay-per-request geocoding API"
    },
    
    "technology_stack": {
        "runtime": "Node.js 18+",
        "framework": "Fastify",
        "language": "TypeScript",
        "database": "SQLite3",
        "cache": "node-cache (in-memory)",
        "process_manager": "PM2",
        "hosting": "DigitalOcean Droplet",
        "cdn": "Cloudflare",
        "ssl": "Let's Encrypt"
    },
    
    "architecture": {
        "pattern": "monolithic-api",
        "deployment": "single-server",
        "scaling_strategy": "vertical-first",
        "caching_strategy": "aggressive-memory-cache",
        "database_approach": "embedded-sqlite"
    },
    
    "project_structure": {
        "src/": "Main application source code",
        "src/routes/": "Fastify route handlers",
        "src/models/": "DigiPin business logic and data models",
        "src/database/": "SQLite schema, migrations, and database utilities",
        "src/cache/": "Caching layer implementation", 
        "src/middleware/": "Authentication, rate limiting, logging middleware",
        "src/utils/": "Helper functions and utilities",
        "src/validation/": "Request/response validation schemas",
        "data/": "SQLite database files and seed data",
        "docs/": "API documentation and OpenAPI specs",
        "tests/": "Unit, integration, and load tests",
        "scripts/": "Deployment and maintenance scripts",
        "config/": "Environment-specific configuration files"
    },
    
    "key_dependencies": {
        "production": {
            "fastify": "^4.24.3",
            "@fastify/cors": "^8.4.0",
            "@fastify/helmet": "^11.1.1", 
            "@fastify/rate-limit": "^8.0.3",
            "@fastify/swagger": "^8.12.0",
            "@fastify/swagger-ui": "^2.1.0",
            "sqlite3": "^5.1.6",
            "node-cache": "^5.1.2",
            "joi": "^17.11.0",
            "pino": "^8.16.1",
            "dotenv": "^16.3.1",
            "digipin": "^1.0.0"
        },
        "development": {
            "typescript": "^5.2.2",
            "@types/node": "^20.8.9",
            "ts-node": "^10.9.1",
            "nodemon": "^3.0.1",
            "jest": "^29.7.0",
            "@types/jest": "^29.5.6",
            "supertest": "^6.3.3",
            "eslint": "^8.52.0",
            "@typescript-eslint/eslint-plugin": "^6.9.1"
        }
    },
    
    "api_endpoints": {
        "geocoding": {
            "POST /v1/geocode": "Convert address/location to DigiPin",
            "POST /v1/reverse": "Convert DigiPin to coordinates/address",
            "POST /v1/batch": "Batch geocoding operations",
            "GET /v1/validate/:digipin": "Validate DigiPin format"
        },
        "utility": {
            "GET /v1/bounds/:digipin": "Get bounding box for DigiPin",
            "GET /v1/neighbors/:digipin": "Get neighboring DigiPins",
            "GET /v1/level/:digipin": "Get DigiPin precision level"
        },
        "system": {
            "GET /health": "Health check endpoint",
            "GET /metrics": "API usage metrics",
            "GET /docs": "API documentation"
        }
    },
    
    "business_logic": {
        "core_features": [
            "Address to DigiPin conversion",
            "DigiPin to coordinates reverse geocoding", 
            "Batch processing support",
            "DigiPin validation and formatting",
            "Precision level detection",
            "Bounding box calculation"
        ],
        "pricing_model": "₹25 per 1,000 requests",
        "free_tier": "50,000 requests/month",
        "rate_limits": {
            "free_tier": "100 requests/minute",
            "paid_tier": "1000 requests/minute"
        }
    },
    
    "performance_requirements": {
        "response_time": "< 50ms (cached), < 200ms (uncached)",
        "throughput": "1000+ requests/minute",
        "uptime": "99.5%",
        "concurrent_connections": "100+",
        "cache_hit_ratio": "> 80%"
    },
    
    "security": {
        "authentication": "API key based",
        "rate_limiting": "Redis-backed sliding window",
        "cors": "Configurable origins",
        "helmet": "Security headers",
        "input_validation": "Joi schema validation",
        "logging": "Structured logging with pino"
    },
    
    "database_schema": {
        "api_keys": {
            "id": "INTEGER PRIMARY KEY",
            "key_hash": "TEXT UNIQUE",
            "user_email": "TEXT",
            "tier": "TEXT DEFAULT 'free'",
            "requests_used": "INTEGER DEFAULT 0", 
            "requests_limit": "INTEGER DEFAULT 50000",
            "created_at": "DATETIME DEFAULT CURRENT_TIMESTAMP"
        },
        "request_logs": {
            "id": "INTEGER PRIMARY KEY",
            "api_key_id": "INTEGER",
            "endpoint": "TEXT",
            "response_time": "INTEGER",
            "created_at": "DATETIME DEFAULT CURRENT_TIMESTAMP"
        },
        "digipin_cache": {
            "id": "INTEGER PRIMARY KEY",
            "input_hash": "TEXT UNIQUE",
            "digipin": "TEXT",
            "latitude": "REAL",
            "longitude": "REAL", 
            "address": "TEXT",
            "created_at": "DATETIME DEFAULT CURRENT_TIMESTAMP"
        }
    },
    
    "environment_variables": {
        "NODE_ENV": "development|production",
        "PORT": "3000",
        "DATABASE_PATH": "./data/digipin.sqlite",
        "CACHE_TTL": "3600",
        "API_KEY_LENGTH": "32",
        "RATE_LIMIT_MAX": "100",
        "RATE_LIMIT_WINDOW": "60000",
        "LOG_LEVEL": "info"
    },
    
    "deployment": {
        "platform": "DigitalOcean Droplet", 
        "specifications": "1GB RAM, 1 vCPU, 25GB SSD",
        "process_manager": "PM2",
        "reverse_proxy": "Nginx (optional)",
        "ssl": "Let's Encrypt via Certbot",
        "monitoring": "PM2 monitoring + custom health checks"
    },
    
    "development_workflow": {
        "setup": [
            "npm install",
            "npm run db:migrate", 
            "npm run dev"
        ],
        "testing": [
            "npm run test",
            "npm run test:integration",
            "npm run test:load"
        ],
        "deployment": [
            "npm run build",
            "npm run deploy"
        ]
    },
    
    "competitive_analysis": {
        "google_geocoding": "₹125 per 1K requests",
        "mapbox": "₹62 per 1K requests", 
        "here": "₹62 per 1K requests",
        "our_pricing": "₹25 per 1K requests",
        "cost_advantage": "60-80% cheaper than competitors"
    },
    
    "revenue_projections": {
        "conservative": "300K requests/month → ₹7,500 revenue → ₹6,995 profit",
        "moderate": "1.5M requests/month → ₹37,500 revenue → ₹36,995 profit", 
        "optimistic": "6M requests/month → ₹150,000 revenue → ₹148,660 profit"
    },
    
    "implementation_notes": {
        "digipin_library": "Use existing npm package 'digipin' by ronitjadhav",
        "sqlite_optimization": "Enable WAL mode for concurrent reads",
        "caching_strategy": "Cache popular Indian cities and frequently requested locations",
        "error_handling": "Comprehensive error responses with proper HTTP status codes",
        "documentation": "Auto-generated OpenAPI docs via Fastify Swagger"
    },
    
    "next_steps": [
        "Initialize TypeScript project with Fastify boilerplate",
        "Set up SQLite database with initial schema",
        "Implement core DigiPin conversion endpoints", 
        "Add authentication and rate limiting middleware",
        "Create comprehensive test suite",
        "Set up deployment pipeline to DigitalOcean",
        "Configure monitoring and logging",
        "Launch with free tier for early adopters"
    ]
}

# Save the context file
with open('digipin_cursor_context.json', 'w') as f:
    json.dump(cursor_context, f, indent=2)

print("✅ Cursor AI context file created: digipin_cursor_context.json")
print(f"File size: {len(json.dumps(cursor_context, indent=2))} characters")

# Also create a package.json template
package_json = {
    "name": "digipin-micro-saas",
    "version": "1.0.0",
    "description": "Ultra-frugal DigiPin geocoding API service for the Indian market",
    "main": "dist/server.js",
    "scripts": {
        "dev": "nodemon --exec ts-node src/server.ts",
        "build": "tsc",
        "start": "node dist/server.js",
        "start:prod": "pm2 start ecosystem.config.js --env production",
        "test": "jest",
        "test:watch": "jest --watch",
        "test:integration": "jest --config jest.integration.config.js",
        "db:migrate": "ts-node scripts/migrate.ts",
        "db:seed": "ts-node scripts/seed.ts",
        "lint": "eslint src/**/*.ts",
        "lint:fix": "eslint src/**/*.ts --fix"
    },
    "keywords": ["digipin", "geocoding", "api", "micro-saas", "india"],
    "author": "Your Name <your.email@example.com>",
    "license": "MIT",
    "dependencies": {
        "fastify": "^4.24.3",
        "@fastify/cors": "^8.4.0", 
        "@fastify/helmet": "^11.1.1",
        "@fastify/rate-limit": "^8.0.3",
        "@fastify/swagger": "^8.12.0",
        "@fastify/swagger-ui": "^2.1.0",
        "sqlite3": "^5.1.6",
        "node-cache": "^5.1.2",
        "joi": "^17.11.0",
        "pino": "^8.16.1",
        "dotenv": "^16.3.1",
        "digipin": "^1.0.0"
    },
    "devDependencies": {
        "typescript": "^5.2.2",
        "@types/node": "^20.8.9",
        "ts-node": "^10.9.1", 
        "nodemon": "^3.0.1",
        "jest": "^29.7.0",
        "@types/jest": "^29.5.6",
        "supertest": "^6.3.3",
        "eslint": "^8.52.0",
        "@typescript-eslint/eslint-plugin": "^6.9.1",
        "@typescript-eslint/parser": "^6.9.1"
    },
    "engines": {
        "node": ">=18.0.0"
    }
}

with open('package.json', 'w') as f:
    json.dump(package_json, f, indent=2)

print("✅ Package.json template created")

# Create tsconfig.json
tsconfig = {
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["ES2020"],
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": True,
        "esModuleInterop": True,
        "skipLibCheck": True,
        "forceConsistentCasingInFileNames": True,
        "resolveJsonModule": True,
        "declaration": True,
        "declarationMap": True,
        "sourceMap": True
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "tests"]
}

with open('tsconfig.json', 'w') as f:
    json.dump(tsconfig, f, indent=2)

print("✅ TypeScript config created")

# Create PM2 ecosystem file
ecosystem_config = {
    "apps": [{
        "name": "digipin-api",
        "script": "dist/server.js",
        "instances": 1,
        "exec_mode": "cluster",
        "env": {
            "NODE_ENV": "development",
            "PORT": 3000
        },
        "env_production": {
            "NODE_ENV": "production", 
            "PORT": 3000
        },
        "error_file": "./logs/err.log",
        "out_file": "./logs/out.log",
        "log_file": "./logs/combined.log",
        "time": True,
        "max_restarts": 10,
        "min_uptime": "10s",
        "max_memory_restart": "150M"
    }]
}

with open('ecosystem.config.js', 'w') as f:
    f.write(f'module.exports = {json.dumps(ecosystem_config, indent=2)};')

print("✅ PM2 ecosystem config created")

print("\n=== FILES CREATED FOR CURSOR AI ===")
files_created = [
    "digipin_cursor_context.json - Main context file for Cursor AI",
    "package.json - Node.js dependencies and scripts", 
    "tsconfig.json - TypeScript configuration",
    "ecosystem.config.js - PM2 process manager configuration"
]

for file in files_created:
    print(f"  ✓ {file}")

print(f"\n🚀 Ready to start development with Cursor AI!")
print(f"📁 Import the digipin_cursor_context.json into Cursor for full project context")