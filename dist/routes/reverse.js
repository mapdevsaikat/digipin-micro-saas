"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = reverseRoutes;
const DigiPinModel_1 = __importDefault(require("../models/DigiPinModel"));
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimiter_1 = require("../middleware/rateLimiter");
async function reverseRoutes(fastify) {
    const digipinModel = new DigiPinModel_1.default();
    fastify.post('/v1/reverse', {
        schema: {
            description: 'Convert DigiPin code to coordinates and address',
            tags: ['Reverse Geocoding'],
            security: [{ apiKey: [] }],
            body: {
                type: 'object',
                required: ['digipin'],
                properties: {
                    digipin: {
                        type: 'string',
                        description: 'The DigiPin code to reverse geocode'
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
                                address: { type: 'string' },
                                coordinates: {
                                    type: 'object',
                                    properties: {
                                        latitude: { type: 'number' },
                                        longitude: { type: 'number' }
                                    }
                                },
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
            if (!body.digipin || body.digipin.trim().length === 0) {
                statusCode = 400;
                errorMessage = 'DigiPin is required';
                return reply.status(400).send({
                    success: false,
                    error: 'Bad Request',
                    message: 'DigiPin is required',
                    code: 'MISSING_DIGIPIN'
                });
            }
            const result = await digipinModel.reverseGeocode(body);
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
                code: 'REVERSE_GEOCODING_ERROR'
            });
        }
        finally {
            await (0, apiKeyAuth_1.logRequest)(request, reply, request.apiKeyInfo?.id || null, statusCode, errorMessage);
        }
    });
}
//# sourceMappingURL=reverse.js.map