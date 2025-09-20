import { FastifyRequest, FastifyReply } from 'fastify';
import Database from 'better-sqlite3';
import DatabaseConnection from '../database/connection';
import crypto from 'crypto';

export interface ApiKeyInfo {
  id: number;
  keyHash: string;
  keyPrefix: string;
  tier: 'free' | 'paid' | 'enterprise';
  monthlyLimit: number;
  currentUsage: number;
  usageResetDate: string;
  isActive: boolean;
}

export interface AuthenticatedRequest extends FastifyRequest {
  apiKeyInfo: ApiKeyInfo;
}

/**
 * Generate a hash for the API key
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Extract API key from request headers
 */
function extractApiKey(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  const apiKeyHeader = request.headers['x-api-key'];
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  if (apiKeyHeader) {
    return apiKeyHeader as string;
  }
  
  return null;
}

/**
 * API Key Authentication Middleware
 */
export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const apiKey = extractApiKey(request);
    
    if (!apiKey) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'API key is required. Provide it via Authorization header (Bearer token) or x-api-key header.',
        code: 'MISSING_API_KEY'
      });
    }

    const db = DatabaseConnection.getInstance().getDatabase();
    const apiKeyHash = hashApiKey(apiKey);

    // Find API key in database
    const stmt = db.prepare(`
      SELECT 
        id,
        key_hash as keyHash,
        key_prefix as keyPrefix,
        tier,
        monthly_limit as monthlyLimit,
        current_usage as currentUsage,
        usage_reset_date as usageResetDate,
        is_active as isActive
      FROM api_keys 
      WHERE key_hash = ? AND is_active = 1
    `);

    const apiKeyInfo = stmt.get(apiKeyHash) as ApiKeyInfo | undefined;

    if (!apiKeyInfo) {
      // Log invalid API key attempt
      await logRequest(request, reply, null, 401, 'Invalid API key');
      
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or inactive API key',
        code: 'INVALID_API_KEY'
      });
    }

    // Check if usage limit is exceeded
    const currentDate = new Date();
    const resetDate = new Date(apiKeyInfo.usageResetDate);
    
    // If reset date has passed, reset usage counter
    if (currentDate > resetDate) {
      const newResetDate = new Date();
      newResetDate.setMonth(newResetDate.getMonth() + 1);
      
      const resetStmt = db.prepare(`
        UPDATE api_keys 
        SET current_usage = 0, usage_reset_date = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      
      resetStmt.run(newResetDate.toISOString(), apiKeyInfo.id);
      apiKeyInfo.currentUsage = 0;
      apiKeyInfo.usageResetDate = newResetDate.toISOString();
    }

    // Check monthly usage limit (skip for enterprise)
    if (apiKeyInfo.tier !== 'enterprise' && apiKeyInfo.currentUsage >= apiKeyInfo.monthlyLimit) {
      await logRequest(request, reply, apiKeyInfo.id, 429, 'Monthly usage limit exceeded');
      
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: `Monthly usage limit of ${apiKeyInfo.monthlyLimit} requests exceeded. Limit resets on ${new Date(apiKeyInfo.usageResetDate).toLocaleDateString()}`,
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: {
          current: apiKeyInfo.currentUsage,
          limit: apiKeyInfo.monthlyLimit,
          resetDate: apiKeyInfo.usageResetDate
        }
      });
    }

    // Attach API key info to request
    (request as AuthenticatedRequest).apiKeyInfo = apiKeyInfo;

  } catch (error) {
    console.error('API key authentication error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication service temporarily unavailable',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Log API request
 */
export async function logRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  apiKeyId: number | null,
  statusCode: number,
  errorMessage?: string
): Promise<void> {
  try {
    const db = DatabaseConnection.getInstance().getDatabase();
    const startTime = (request as any).startTime || Date.now();
    const responseTime = Date.now() - startTime;

    const logStmt = db.prepare(`
      INSERT INTO request_logs (
        api_key_id,
        endpoint,
        method,
        request_ip,
        user_agent,
        request_body,
        response_status,
        response_time_ms,
        error_message,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    logStmt.run(
      apiKeyId,
      request.url,
      request.method,
      request.ip,
      request.headers['user-agent'] || null,
      request.method !== 'GET' ? JSON.stringify(request.body) : null,
      statusCode,
      responseTime,
      errorMessage || null
    );

    // Update usage counter if request was successful and API key exists
    if (apiKeyId && statusCode < 400) {
      const updateStmt = db.prepare(`
        UPDATE api_keys 
        SET current_usage = current_usage + 1, updated_at = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(apiKeyId);
    }

  } catch (error) {
    console.error('Failed to log request:', error);
  }
}

/**
 * Get API key usage statistics
 */
export function getApiKeyUsage(apiKeyId: number): {
  currentUsage: number;
  monthlyLimit: number;
  resetDate: string;
  tier: string;
} | null {
  try {
    const db = DatabaseConnection.getInstance().getDatabase();
    const stmt = db.prepare(`
      SELECT 
        current_usage as currentUsage,
        monthly_limit as monthlyLimit,
        usage_reset_date as resetDate,
        tier
      FROM api_keys 
      WHERE id = ?
    `);

    return stmt.get(apiKeyId) as any;
  } catch (error) {
    console.error('Failed to get API key usage:', error);
    return null;
  }
}

/**
 * Create a new API key
 */
export function createApiKey(
  tier: 'free' | 'paid' | 'enterprise',
  monthlyLimit?: number
): { apiKey: string; apiKeyInfo: ApiKeyInfo } {
  try {
    const db = DatabaseConnection.getInstance().getDatabase();
    
    // Generate a secure API key
    const apiKey = `dp_${crypto.randomBytes(32).toString('hex')}`;
    const apiKeyHash = hashApiKey(apiKey);
    const keyPrefix = `dp_${apiKey.substring(3, 8)}`;
    
    // Set default limits based on tier
    const limits = {
      free: 1000,
      paid: 10000,
      enterprise: 999999
    };
    
    const finalMonthlyLimit = monthlyLimit || limits[tier];
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    const stmt = db.prepare(`
      INSERT INTO api_keys (
        key_hash,
        key_prefix,
        tier,
        monthly_limit,
        current_usage,
        usage_reset_date,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, 1, datetime('now'), datetime('now'))
    `);

    const result = stmt.run(
      apiKeyHash,
      keyPrefix,
      tier,
      finalMonthlyLimit,
      resetDate.toISOString()
    );

    const apiKeyInfo: ApiKeyInfo = {
      id: result.lastInsertRowid as number,
      keyHash: apiKeyHash,
      keyPrefix,
      tier,
      monthlyLimit: finalMonthlyLimit,
      currentUsage: 0,
      usageResetDate: resetDate.toISOString(),
      isActive: true
    };

    return { apiKey, apiKeyInfo };
  } catch (error) {
    throw new Error(`Failed to create API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
