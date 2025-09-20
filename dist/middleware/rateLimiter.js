"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tieredRateLimit = tieredRateLimit;
exports.burstRateLimit = burstRateLimit;
exports.getRateLimitStatus = getRateLimitStatus;
exports.clearRateLimit = clearRateLimit;
const DEFAULT_RATE_LIMITS = {
    free: {
        requests: 10,
        windowMs: 60 * 1000
    },
    paid: {
        requests: 100,
        windowMs: 60 * 1000
    },
    enterprise: {
        requests: 1000,
        windowMs: 60 * 1000
    }
};
const rateLimitStore = new Map();
function cleanExpiredEntries() {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}
function getRateLimitKey(request, apiKeyInfo) {
    if (apiKeyInfo) {
        return `api_key:${apiKeyInfo.id}`;
    }
    return `ip:${request.ip}`;
}
function isWithinRateLimit(key, tier, config = DEFAULT_RATE_LIMITS) {
    const limit = config[tier];
    const now = Date.now();
    if (Math.random() < 0.01) {
        cleanExpiredEntries();
    }
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetTime) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + limit.windowMs
        });
        return {
            allowed: true,
            remaining: limit.requests - 1,
            resetTime: now + limit.windowMs
        };
    }
    if (entry.count >= limit.requests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime
        };
    }
    entry.count++;
    rateLimitStore.set(key, entry);
    return {
        allowed: true,
        remaining: limit.requests - entry.count,
        resetTime: entry.resetTime
    };
}
async function tieredRateLimit(request, reply) {
    try {
        const config = DEFAULT_RATE_LIMITS;
        const apiKeyInfo = request.apiKeyInfo;
        let tier = 'free';
        if (apiKeyInfo) {
            tier = apiKeyInfo.tier;
        }
        const key = getRateLimitKey(request, apiKeyInfo);
        const rateLimitResult = isWithinRateLimit(key, tier, config);
        reply.header('X-RateLimit-Limit', config[tier].requests);
        reply.header('X-RateLimit-Remaining', rateLimitResult.remaining);
        reply.header('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
        if (!rateLimitResult.allowed) {
            const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
            reply.header('Retry-After', retryAfter);
            return reply.status(429).send({
                error: 'Too Many Requests',
                message: `Rate limit exceeded. ${tier} tier allows ${config[tier].requests} requests per ${config[tier].windowMs / 1000} seconds`,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter,
                tier,
                limit: config[tier].requests,
                windowMs: config[tier].windowMs
            });
        }
    }
    catch (error) {
        console.error('Rate limiting error:', error);
    }
}
async function burstRateLimit(request, reply, operationCount) {
    try {
        const apiKeyInfo = request.apiKeyInfo;
        if (!apiKeyInfo) {
            return;
        }
        const burstLimits = {
            free: 5,
            paid: 50,
            enterprise: 100
        };
        const burstLimit = burstLimits[apiKeyInfo.tier];
        if (operationCount > burstLimit) {
            return reply.status(429).send({
                error: 'Too Many Requests',
                message: `Burst limit exceeded. ${apiKeyInfo.tier} tier allows maximum ${burstLimit} operations in a single request`,
                code: 'BURST_LIMIT_EXCEEDED',
                tier: apiKeyInfo.tier,
                limit: burstLimit,
                requested: operationCount
            });
        }
    }
    catch (error) {
        console.error('Burst rate limiting error:', error);
    }
}
function getRateLimitStatus(request) {
    try {
        const config = DEFAULT_RATE_LIMITS;
        const apiKeyInfo = request.apiKeyInfo;
        if (!apiKeyInfo) {
            return null;
        }
        const tier = apiKeyInfo.tier;
        const key = getRateLimitKey(request, apiKeyInfo);
        const entry = rateLimitStore.get(key);
        if (!entry) {
            return {
                tier,
                limit: config[tier].requests,
                windowMs: config[tier].windowMs,
                remaining: config[tier].requests,
                resetTime: Date.now() + config[tier].windowMs
            };
        }
        const remaining = Math.max(0, config[tier].requests - entry.count);
        return {
            tier,
            limit: config[tier].requests,
            windowMs: config[tier].windowMs,
            remaining,
            resetTime: entry.resetTime
        };
    }
    catch (error) {
        console.error('Failed to get rate limit status:', error);
        return null;
    }
}
function clearRateLimit(apiKeyId) {
    try {
        const key = `api_key:${apiKeyId}`;
        return rateLimitStore.delete(key);
    }
    catch (error) {
        console.error('Failed to clear rate limit:', error);
        return false;
    }
}
//# sourceMappingURL=rateLimiter.js.map