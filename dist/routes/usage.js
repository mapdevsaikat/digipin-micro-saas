"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = usageRoutes;
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimiter_1 = require("../middleware/rateLimiter");
async function usageRoutes(fastify) {
    fastify.get('/v1/usage', {
        schema: {
            description: 'Get usage information for the authenticated API key',
            tags: ['Usage'],
            security: [{ apiKey: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                usage: {
                                    type: 'object',
                                    properties: {
                                        currentUsage: { type: 'number' },
                                        monthlyLimit: { type: 'number' },
                                        resetDate: { type: 'string' },
                                        tier: { type: 'string' }
                                    }
                                },
                                rateLimit: {
                                    type: 'object',
                                    properties: {
                                        tier: { type: 'string' },
                                        limit: { type: 'number' },
                                        windowMs: { type: 'number' },
                                        remaining: { type: 'number' },
                                        resetTime: { type: 'number' }
                                    }
                                },
                                apiKeyInfo: {
                                    type: 'object',
                                    properties: {
                                        keyPrefix: { type: 'string' },
                                        tier: { type: 'string' },
                                        isActive: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    }
                },
                401: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                        code: { type: 'string' }
                    }
                }
            }
        },
        preHandler: [apiKeyAuth_1.apiKeyAuth]
    }, async (request, reply) => {
        const startTime = Date.now();
        let statusCode = 200;
        let errorMessage;
        try {
            const apiKeyInfo = request.apiKeyInfo;
            if (!apiKeyInfo) {
                statusCode = 401;
                errorMessage = 'API key information not available';
                return reply.status(401).send({
                    success: false,
                    error: 'Unauthorized',
                    message: 'API key information not available',
                    code: 'MISSING_API_KEY_INFO'
                });
            }
            const usageInfo = (0, apiKeyAuth_1.getApiKeyUsage)(apiKeyInfo.id);
            const rateLimitStatus = (0, rateLimiter_1.getRateLimitStatus)(request);
            const response = {
                success: true,
                data: {
                    usage: usageInfo || {
                        currentUsage: apiKeyInfo.currentUsage,
                        monthlyLimit: apiKeyInfo.monthlyLimit,
                        resetDate: apiKeyInfo.usageResetDate,
                        tier: apiKeyInfo.tier
                    },
                    rateLimit: rateLimitStatus || {
                        tier: apiKeyInfo.tier,
                        limit: 0,
                        windowMs: 0,
                        remaining: 0,
                        resetTime: 0
                    },
                    apiKeyInfo: {
                        keyPrefix: apiKeyInfo.keyPrefix,
                        tier: apiKeyInfo.tier,
                        isActive: apiKeyInfo.isActive
                    }
                }
            };
            return reply.send(response);
        }
        catch (error) {
            statusCode = 500;
            errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(500).send({
                success: false,
                error: 'Internal Server Error',
                message: errorMessage,
                code: 'USAGE_ERROR'
            });
        }
        finally {
            await (0, apiKeyAuth_1.logRequest)(request, reply, request.apiKeyInfo?.id || null, statusCode, errorMessage);
        }
    });
}
//# sourceMappingURL=usage.js.map