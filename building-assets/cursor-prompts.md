# Cursor AI Development Prompts for DigiPin Micro-SaaS

## Initial Setup Prompts

1. "Create a Fastify server with TypeScript that includes CORS, Helmet, Rate Limiting, and Swagger documentation"

2. "Set up SQLite database connection with migrations for api_keys, request_logs, and digipin_cache tables"

3. "Implement DigiPin model class with methods for geocoding, reverse geocoding, and validation using the digipin npm package"

4. "Create API key authentication middleware that validates keys against SQLite database and tracks usage"

5. "Build rate limiting middleware with different limits for free and paid tiers"

## Core Feature Prompts

6. "Implement POST /v1/geocode endpoint that converts addresses to DigiPin codes with caching"

7. "Create POST /v1/reverse endpoint for DigiPin to coordinates conversion with error handling"

8. "Add POST /v1/batch endpoint for processing multiple geocoding requests efficiently"

9. "Build GET /v1/validate/:digipin endpoint with comprehensive DigiPin format validation"

10. "Implement caching layer using node-cache for frequently requested locations"

## Business Logic Prompts

11. "Create usage tracking system that logs API requests and updates usage counters"

12. "Build tiered pricing logic that enforces different rate limits based on user tier"

13. "Implement comprehensive error handling with proper HTTP status codes and error messages"

14. "Add request/response validation using Joi schemas for all endpoints"

15. "Create health check endpoint with database connectivity and cache status"

## Testing Prompts

16. "Write comprehensive Jest unit tests for DigiPin model methods"

17. "Create integration tests for all API endpoints using Supertest"

18. "Add load testing setup to verify 1000+ requests/minute capacity"

19. "Build test fixtures and mock data for Indian addresses and DigiPin codes"

20. "Implement test database seeding with sample API keys and usage data"

## Deployment Prompts  

21. "Create PM2 ecosystem configuration for production deployment"

22. "Build deployment script for DigitalOcean droplet with environment setup"

23. "Add logging configuration using Pino for structured logging"

24. "Implement database backup and restore scripts"

25. "Create monitoring and alerting setup for uptime and performance tracking"

## Use these prompts with Cursor AI to rapidly develop the DigiPin Micro-SaaS!
