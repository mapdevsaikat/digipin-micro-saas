# DigiPin Micro-SaaS API

A comprehensive micro-SaaS API for DigiPin geocoding services built with Fastify, TypeScript, and SQLite.

## Features

- **Geocoding**: Convert addresses to DigiPin codes
- **Reverse Geocoding**: Convert DigiPin codes to coordinates and addresses
- **Batch Processing**: Process multiple geocoding requests efficiently
- **Validation**: Validate DigiPin format and verify real locations
- **API Key Authentication**: Secure API access with tiered usage limits
- **Rate Limiting**: Tier-based rate limiting (free, paid, enterprise)
- **Caching**: In-memory and database caching for improved performance
- **Usage Tracking**: Comprehensive request logging and usage analytics
- **Swagger Documentation**: Interactive API documentation

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

### Base URL
```
http://localhost:3000
```

### Documentation
```
http://localhost:3000/docs
```

### Health Check
```bash
GET /health
```

### Geocoding
```bash
POST /v1/geocode
Content-Type: application/json
x-api-key: your-api-key

{
  "address": "123 Main Street, New Delhi, Delhi, 110001, India",
  "city": "New Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "country": "India"
}
```

### Reverse Geocoding
```bash
POST /v1/reverse
Content-Type: application/json
x-api-key: your-api-key

{
  "digipin": "ABC123DEF456"
}
```

### Batch Geocoding
```bash
POST /v1/batch
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
GET /v1/validate/ABC123DEF456
x-api-key: your-api-key
```

### Usage Information
```bash
GET /v1/usage
x-api-key: your-api-key
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
curl -X POST http://localhost:3000/v1/geocode \
  -H "Content-Type: application/json" \
  -H "x-api-key: free_test_key_hash_12345" \
  -d '{"address": "123 Main Street, New Delhi"}'
```

## Production Deployment

1. Build the application: `npm run build`
2. Set production environment variables
3. Use PM2 or similar process manager
4. Configure reverse proxy (nginx/Apache)
5. Set up monitoring and logging

## License

MIT License - see LICENSE file for details.
