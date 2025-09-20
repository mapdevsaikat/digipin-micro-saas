"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = geocodeRoutes;
const DigiPinModel_1 = __importDefault(require("../models/DigiPinModel"));
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimiter_1 = require("../middleware/rateLimiter");
async function geocodeRoutes(fastify) {
    const digipinModel = new DigiPinModel_1.default();
    fastify.post('/v1/geocode', {
        schema: {
            description: 'Convert address to DigiPin code',
            tags: ['Geocoding'],
            security: [{ apiKey: [] }],
            body: {
                type: 'object',
                required: ['address'],
                properties: {
                    address: {
                        type: 'string',
                        description: 'The address to geocode'
                    },
                    city: {
                        type: 'string',
                        description: 'City name (optional)'
                    },
                    state: {
                        type: 'string',
                        description: 'State name (optional)'
                    },
                    pincode: {
                        type: 'string',
                        description: 'Postal code (optional)'
                    },
                    country: {
                        type: 'string',
                        description: 'Country name (optional)'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                digipin: { type: 'string' },
                                coordinates: {
                                    type: 'object',
                                    properties: {
                                        latitude: { type: 'number' },
                                        longitude: { type: 'number' }
                                    }
                                },
                                address: { type: 'string' },
                                confidence: { type: 'number' }
                            }
                        }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                        code: { type: 'string' }
                    }
                },
                401: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                        code: { type: 'string' }
                    }
                },
                429: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                        code: { type: 'string' }
                    }
                }
            }
        },
        preHandler: [apiKeyAuth_1.apiKeyAuth, rateLimiter_1.tieredRateLimit]
    }, async (request, reply) => {
        const startTime = Date.now();
        let statusCode = 200;
        let errorMessage;
        try {
            const body = request.body;
            if (!body.address || body.address.trim().length === 0) {
                statusCode = 400;
                errorMessage = 'Address is required';
                return reply.status(400).send({
                    success: false,
                    error: 'Bad Request',
                    message: 'Address is required',
                    code: 'MISSING_ADDRESS'
                });
            }
            const result = await digipinModel.geocode(body);
            return reply.send({
                success: true,
                data: result
            });
        }
        catch (error) {
            statusCode = 500;
            errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(500).send({
                success: false,
                error: 'Internal Server Error',
                message: errorMessage,
                code: 'GEOCODING_ERROR'
            });
        }
        finally {
            await (0, apiKeyAuth_1.logRequest)(request, reply, request.apiKeyInfo?.id || null, statusCode, errorMessage);
        }
    });
}
//# sourceMappingURL=geocode.js.map