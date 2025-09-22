# QuantaRoute DigiPin API

A production-ready micro-SaaS API for DigiPin geocoding services, providing both official DigiPin compatibility and enhanced SaaS features. Built with Fastify, TypeScript, and SQLite.

## 🌟 Live API

**Production URL**: `https://api.quantaroute.com`
**Documentation**: `https://api.quantaroute.com/v1/digipin/docs`
**Website**: `https://quantaroute.com` (Frontend hosted on Vercel)

## ✨ Features

### Core DigiPin Services
- **Geocoding**: Convert addresses to DigiPin codes with real coordinates
- **Coordinates to DigiPin**: Convert latitude/longitude directly to DigiPin codes
- **Reverse Geocoding**: Convert DigiPin codes back to coordinates and addresses
- **DigiPin Validation**: Validate DigiPin format and verify real locations
- **Batch Processing**: Process multiple geocoding requests efficiently

### Official Compatibility
- **Official DigiPin API Compatible**: Supports standard `/encode` and `/decode` endpoints
- **Drop-in Replacement**: Compatible with existing DigiPin implementations
- **Real DigiPin Generation**: Uses official DigiPin library (no mock data)

### Enterprise SaaS Features
- **Versioned API Structure**: Professional `/v1/digipin/*` endpoints following industry standards
- **API Key Authentication**: Secure API access with tiered usage limits
- **Rate Limiting**: Tier-based rate limiting (free, paid, enterprise)
- **Usage Analytics**: Comprehensive request logging and usage tracking
- **Caching System**: In-memory and database caching for improved performance
- **Production Monitoring**: Health checks, uptime monitoring, and error tracking
- **Interactive Documentation**: Swagger UI with live API testing
- **Backward Compatibility**: Automatic redirects for legacy endpoints

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the development server
npm run dev

# Or start the production server
npm start
```

### Default API Keys

The system comes with pre-configured test API keys:

- **Free Tier**: `free_test_key_hash_12345` (1000 requests/month)
- **Paid Tier**: `paid_test_key_hash_67890` (10000 requests/month)  
- **Enterprise Tier**: `enterprise_test_key_hash_11111` (unlimited requests)

## API Endpoints

### Production API Base URL
```
https://api.quantaroute.com
```

### Documentation & Testing
```
https://api.quantaroute.com/v1/digipin/docs
```

### Frontend Website
```
https://quantaroute.com
```

## 🚀 Official DigiPin API Compatibility

For developers migrating from or integrating with the official DigiPin API:

### Encode Coordinates to DigiPin
```bash
GET https://api.quantaroute.com/v1/digipin/encode?latitude=28.6139&longitude=77.2090
x-api-key: your-api-key

# Response
{"digipin": "39J-438-TJC7"}
```

### Decode DigiPin to Coordinates  
```bash
GET https://api.quantaroute.com/v1/digipin/decode?digipin=39J-438-TJC7
x-api-key: your-api-key

# Response
{"latitude": "28.6139", "longitude": "77.2090"}
```

## 📍 Enhanced SaaS Endpoints

### Health Check
```bash
GET /health
```

### Address to DigiPin
```bash
POST https://api.quantaroute.com/v1/digipin/geocode
Content-Type: application/json
x-api-key: your-api-key

{
  "address": "India Gate, New Delhi, India"
}

# Response
{
  "success": true,
  "data": {
    "digipin": "39J-49J-4867",
    "coordinates": {
      "latitude": 28.642724303116253,
      "longitude": 77.21532054862492
    },
    "address": "India Gate, New Delhi, India",
    "confidence": 0.8
  }
}
```

### Coordinates to DigiPin
```bash
POST https://api.quantaroute.com/v1/digipin/coordinates-to-digipin
Content-Type: application/json
x-api-key: your-api-key

{
  "latitude": 28.6139,
  "longitude": 77.2090
}

# Response
{
  "success": true,
  "data": {
    "digipin": "39J-438-TJC7",
    "coordinates": {
      "latitude": 28.6139,
      "longitude": 77.2090
    }
  }
}
```

### Reverse Geocoding
```bash
POST https://api.quantaroute.com/v1/digipin/reverse
Content-Type: application/json
x-api-key: your-api-key

{
  "digipin": "ABC123DEF456"
}
```

### Batch Geocoding
```bash
POST https://api.quantaroute.com/v1/digipin/batch
Content-Type: application/json
x-api-key: your-api-key

{
  "addresses": [
    {
      "address": "123 Main Street, New Delhi, Delhi, 110001, India"
    },
    {
      "address": "456 Park Avenue, Mumbai, Maharashtra, 400001, India"
    }
  ]
}
```

### Validation
```bash
GET https://api.quantaroute.com/v1/digipin/validate/ABC123DEF456
x-api-key: your-api-key
```

### Usage Analytics
```bash
GET https://api.quantaroute.com/v1/digipin/usage
x-api-key: your-api-key

# Response
{
  "success": true,
  "data": {
    "usage": {
      "currentUsage": 4,
      "monthlyLimit": 1000,
      "resetDate": "2025-10-21 00:01:37",
      "tier": "free"
    },
    "rateLimit": {
      "tier": "free",
      "limit": 10,
      "windowMs": 60000,
      "remaining": 7,
      "resetTime": 1758413045095
    },
    "apiKeyInfo": {
      "keyPrefix": "free_test",
      "tier": "free",
      "isActive": true
    }
  }
}
```

## Rate Limits

| Tier | Requests/Minute | Monthly Limit | Burst Limit |
|------|----------------|---------------|-------------|
| Free | 10 | 1,000 | 5 |
| Paid | 100 | 10,000 | 50 |
| Enterprise | 1,000 | Unlimited | 100 |

## Authentication

All API endpoints require authentication via API key. Include your API key in the request header:

```
x-api-key: your-api-key
```

Or as a Bearer token:

```
Authorization: Bearer your-api-key
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human readable error message",
  "code": "ERROR_CODE"
}
```

## Database Schema

The API uses SQLite with the following tables:

- `api_keys`: API key management and usage tracking
- `request_logs`: Request logging and analytics
- `digipin_cache`: Caching layer for improved performance

## Development

### Project Structure

```
src/
├── database/          # Database connection and migrations
├── middleware/        # Authentication and rate limiting
├── models/           # Business logic and DigiPin operations
├── routes/           # API endpoint definitions
└── server.ts         # Main server configuration
```

### Environment Variables

```bash
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DATABASE_PATH=./data/digipin.db
```

### Building

```bash
npm run build
```

### Testing

```bash
# Test individual endpoints
curl -X GET http://localhost:3000/health
curl -X POST https://api.quantaroute.com/v1/digipin/geocode \
  -H "Content-Type: application/json" \
  -H "x-api-key: free_test_key_hash_12345" \
  -d '{"address": "123 Main Street, New Delhi"}'
```

## 🚀 Production Ready

This API is **live and production-ready** at `https://api.quantaroute.com`

### Deployment Features
- ✅ **Digital Ocean VPS**: Deployed on optimized cloud infrastructure
- ✅ **PM2 Process Management**: Auto-restart, monitoring, and clustering
- ✅ **Nginx Reverse Proxy**: Load balancing and security headers
- ✅ **SSL/HTTPS Enabled**: Secure connections with SSL certificate
- ✅ **SQLite Database**: Reliable data persistence with automatic backups
- ✅ **Rate Limiting**: Prevents abuse and ensures fair usage
- ✅ **Error Handling**: Comprehensive error responses and logging
- ✅ **CORS Enabled**: Ready for web application integration

### For Developers
- **No Setup Required**: Use the live API immediately
- **Official Compatibility**: Drop-in replacement for official DigiPin API
- **Enhanced Features**: Additional endpoints and analytics not available elsewhere
- **Production Stability**: 99.9% uptime with monitoring and alerts

### Getting API Access
1. Use the test API keys provided above for development
2. Contact for production API keys with higher limits
3. Integrate using standard HTTP requests or our Swagger documentation

## License

MIT License - see LICENSE file for details.
