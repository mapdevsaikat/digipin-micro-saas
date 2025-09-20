"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const connection_1 = __importDefault(require("./database/connection"));
const geocode_1 = __importDefault(require("./routes/geocode"));
const reverse_1 = __importDefault(require("./routes/reverse"));
const batch_1 = __importDefault(require("./routes/batch"));
const validate_1 = __importDefault(require("./routes/validate"));
const usage_1 = __importDefault(require("./routes/usage"));
const fastify = (0, fastify_1.default)({
    logger: {
        level: 'info'
    }
});
fastify.register(cors_1.default, {
    origin: true,
    credentials: true
});
fastify.register(helmet_1.default, {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
});
fastify.register(rate_limit_1.default, {
    max: 100,
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
fastify.register(swagger_1.default, {
    swagger: {
        info: {
            title: 'QuantaRoute DigiPin API',
            description: 'DigiPin geocoding services powered by QuantaRoute - Advanced geospatial solutions',
            version: '1.0.0'
        },
        host: process.env.NODE_ENV === 'production' ? 'quantaroute.com' : 'localhost:3000',
        basePath: process.env.NODE_ENV === 'production' ? '/api/digipin' : '',
        schemes: process.env.NODE_ENV === 'production' ? ['https'] : ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
            { name: 'Geocoding', description: 'Address to DigiPin conversion' },
            { name: 'Reverse Geocoding', description: 'DigiPin to coordinates conversion' },
            { name: 'Validation', description: 'DigiPin format validation' },
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
fastify.register(swagger_ui_1.default, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'full',
        deepLinking: false
    },
    uiHooks: {
        onRequest: function (request, reply, next) { next(); },
        preHandler: function (request, reply, next) { next(); }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => { return swaggerObject; },
    transformSpecificationClone: true
});
fastify.register(geocode_1.default);
fastify.register(reverse_1.default);
fastify.register(batch_1.default);
fastify.register(validate_1.default);
fastify.register(usage_1.default);
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
    const basePath = process.env.NODE_ENV === 'production' ? '/digipin' : '';
    return {
        message: 'QuantaRoute DigiPin API',
        version: '1.0.0',
        documentation: `${basePath}/docs`,
        website: 'https://quantaroute.com',
        products: {
            digipin: `${basePath}/`,
            routing: 'https://quantaroute.com/routing'
        }
    };
});
const start = async () => {
    try {
        const dbConnection = connection_1.default.getInstance();
        await dbConnection.runMigrations();
        console.log('✅ Database initialized and migrations applied');
        const port = process.env.PORT || 3000;
        const host = process.env.HOST || '0.0.0.0';
        await fastify.listen({ port: Number(port), host });
        console.log(`🚀 Server is running on http://${host}:${port}`);
        console.log(`📚 Documentation available at http://${host}:${port}/docs`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map