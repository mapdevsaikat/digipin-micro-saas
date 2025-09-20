import { FastifyRequest, FastifyReply } from 'fastify';
export interface RateLimitConfig {
    free: {
        requests: number;
        windowMs: number;
    };
    paid: {
        requests: number;
        windowMs: number;
    };
    enterprise: {
        requests: number;
        windowMs: number;
    };
}
export declare function tieredRateLimit(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function burstRateLimit(request: FastifyRequest, reply: FastifyReply, operationCount: number): Promise<void>;
export declare function getRateLimitStatus(request: FastifyRequest): {
    tier: string;
    limit: number;
    windowMs: number;
    remaining: number;
    resetTime: number;
} | null;
export declare function clearRateLimit(apiKeyId: number): boolean;
//# sourceMappingURL=rateLimiter.d.ts.map