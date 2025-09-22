import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import DatabaseConnection from './database/connection';

// Import routes
import geocodeRoutes from './routes/geocode';
import reverseRoutes from './routes/reverse';
import batchRoutes from './routes/batch';
import validateRoutes from './routes/validate';
import usageRoutes from './routes/usage';
import officialCompatibilityRoutes from './routes/official-compatibility';

const fastify = Fastify({
  logger: {
    level: 'info'
  }
});

// Register CORS
fastify.register(cors, {
  origin: true,
  credentials: true
});

// Register Helmet for security headers
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "validator.swagger.io"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https:", "http:"],
    },
  },
});

// Register Rate Limiting
fastify.register(rateLimit, {
  max: 100, // requests per timeWindow
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    const apiKey = request.headers['x-api-key'];
    return apiKey ? String(apiKey) : request.ip;
  },
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.after}`,
      retryAfter: Math.round(context.ttl / 1000) || 1
    };
  }
});

// Register Swagger Documentation
fastify.register(swagger, {
  swagger: {
    info: {
      title: 'QuantaRoute DigiPin API',
      description: 'DigiPin geocoding services powered by QuantaRoute - Advanced geospatial solutions',
      version: '1.0.0'
    },
    host: process.env.NODE_ENV === 'production' ? 'api.quantaroute.com' : 'localhost:3000',
    basePath: '',
    schemes: process.env.NODE_ENV === 'production' ? ['https'] : ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'Geocoding', description: 'Address to DigiPin conversion' },
      { name: 'Reverse Geocoding', description: 'DigiPin to coordinates conversion' },
      { name: 'Official Compatibility', description: 'Official DigiPin API compatible endpoints' },
      { name: 'Validation', description: 'DigiPin format validation' },
      { name: 'Usage', description: 'API usage tracking and monitoring' },
      { name: 'Health', description: 'Health check endpoints' }
    ],
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header'
      }
    }
  }
});

fastify.register(swaggerUi, {
  routePrefix: '/docs',
  staticCSP: false,
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  uiHooks: {
    onRequest: function (request, reply, next) { next() },
    preHandler: function (request, reply, next) { next() }
  },
  transformSpecificationClone: false
});

// Register API routes
fastify.register(geocodeRoutes);
fastify.register(reverseRoutes);
fastify.register(batchRoutes);
fastify.register(validateRoutes);
fastify.register(usageRoutes);
fastify.register(officialCompatibilityRoutes);

// Health check endpoint
fastify.get('/health', {
  schema: {
    description: 'Health check endpoint',
    tags: ['Health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          uptime: { type: 'number' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// Root endpoint
fastify.get('/', {
  schema: {
    description: 'Root endpoint with API information',
    tags: ['Health'],
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          version: { type: 'string' },
          documentation: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    message: 'QuantaRoute DigiPin API',
    version: '1.0.0',
    documentation: '/docs',
    website: 'https://quantaroute.com',
    apiUrl: process.env.NODE_ENV === 'production' ? 'https://api.quantaroute.com' : 'http://localhost:3000',
    products: {
      digipin: '/',
      routing: 'https://quantaroute.com/routing'
    }
  };
});

// Start the server
const start = async () => {
  try {
    // Initialize database and run migrations
    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.runMigrations();
    console.log('✅ Database initialized and migrations applied');

    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port: Number(port), host });
    console.log(`🚀 Server is running on http://${host}:${port}`);
    console.log(`📚 Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
