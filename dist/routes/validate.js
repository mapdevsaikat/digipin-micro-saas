"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = validateRoutes;
const DigiPinModel_1 = __importDefault(require("../models/DigiPinModel"));
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimiter_1 = require("../middleware/rateLimiter");
async function validateRoutes(fastify) {
    const digipinModel = new DigiPinModel_1.default();
    fastify.get('/v1/validate/:digipin', {
        schema: {
            description: 'Validate DigiPin format and check if it corresponds to a real location',
            tags: ['Validation'],
            security: [{ apiKey: [] }],
            params: {
                type: 'object',
                required: ['digipin'],
                properties: {
                    digipin: {
                        type: 'string',
                        description: 'The DigiPin code to validate'
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
                                isValid: { type: 'boolean' },
                                digipin: { type: 'string' },
                                errors: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Array of validation errors (only present if isValid is false)'
                                }
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
            const params = request.params;
            const digipin = params.digipin;
            if (!digipin || digipin.trim().length === 0) {
                statusCode = 400;
                errorMessage = 'DigiPin parameter is required';
                return reply.status(400).send({
                    success: false,
                    error: 'Bad Request',
                    message: 'DigiPin parameter is required',
                    code: 'MISSING_DIGIPIN_PARAM'
                });
            }
            const result = await digipinModel.validate(digipin.trim());
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
                code: 'VALIDATION_ERROR'
            });
        }
        finally {
            await (0, apiKeyAuth_1.logRequest)(request, reply, request.apiKeyInfo?.id || null, statusCode, errorMessage);
        }
    });
}
//# sourceMappingURL=validate.js.map