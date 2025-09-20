import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from './apiKeyAuth';

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

// Default rate limit configurations
const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  free: {
    requests: 10, // 10 requests per minute
    windowMs: 60 * 1000 // 1 minute
  },
  paid: {
    requests: 100, // 100 requests per minute
    windowMs: 60 * 1000 // 1 minute
  },
  enterprise: {
    requests: 1000, // 1000 requests per minute
    windowMs: 60 * 1000 // 1 minute
  }
};

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Clean expired entries from rate limit store
 */
function cleanExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit key for the request
 */
function getRateLimitKey(request: FastifyRequest, apiKeyInfo?: any): string {
  if (apiKeyInfo) {
    return `api_key:${apiKeyInfo.id}`;
  }
  return `ip:${request.ip}`;
}

/**
 * Check if request is within rate limit
 */
function isWithinRateLimit(
  key: string,
  tier: 'free' | 'paid' | 'enterprise',
  config: RateLimitConfig = DEFAULT_RATE_LIMITS
): { allowed: boolean; remaining: number; resetTime: number } {
  const limit = config[tier];
  const now = Date.now();
  
  // Clean expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanExpiredEntries();
  }

  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
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

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: limit.requests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Rate limiting middleware with tier-based limits
 */
export async function tieredRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const config = DEFAULT_RATE_LIMITS;
    const apiKeyInfo = (request as any).apiKeyInfo;
    
    // Determine tier
    let tier: 'free' | 'paid' | 'enterprise' = 'free';
    if (apiKeyInfo) {
      tier = apiKeyInfo.tier;
    }

    const key = getRateLimitKey(request, apiKeyInfo);
    const rateLimitResult = isWithinRateLimit(key, tier, config);

    // Add rate limit headers
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

  } catch (error) {
    console.error('Rate limiting error:', error);
    // Don't fail the request due to rate limiting errors
  }
}

/**
 * Burst rate limiting for batch operations
 */
export async function burstRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  operationCount: number
): Promise<void> {
  try {
    const apiKeyInfo = (request as any).apiKeyInfo;
    if (!apiKeyInfo) {
      return; // No API key, skip burst limiting
    }

    // Burst limits based on tier
    const burstLimits = {
      free: 5,    // Max 5 operations in burst
      paid: 50,   // Max 50 operations in burst
      enterprise: 100 // Max 100 operations in burst
    };

    const burstLimit = burstLimits[apiKeyInfo.tier as keyof typeof burstLimits];
    
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

  } catch (error) {
    console.error('Burst rate limiting error:', error);
    // Don't fail the request due to burst limiting errors
  }
}

/**
 * Get rate limit status for a user
 */
export function getRateLimitStatus(
  request: FastifyRequest
): {
  tier: string;
  limit: number;
  windowMs: number;
  remaining: number;
  resetTime: number;
} | null {
  try {
    const config = DEFAULT_RATE_LIMITS;
    const apiKeyInfo = (request as any).apiKeyInfo;
    
    if (!apiKeyInfo) {
      return null;
    }

    const tier = apiKeyInfo.tier as keyof typeof config;
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
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return null;
  }
}

/**
 * Clear rate limit for a specific user (admin function)
 */
export function clearRateLimit(apiKeyId: number): boolean {
  try {
    const key = `api_key:${apiKeyId}`;
    return rateLimitStore.delete(key);
  } catch (error) {
    console.error('Failed to clear rate limit:', error);
    return false;
  }
}
