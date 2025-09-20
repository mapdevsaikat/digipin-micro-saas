"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashApiKey = hashApiKey;
exports.apiKeyAuth = apiKeyAuth;
exports.logRequest = logRequest;
exports.getApiKeyUsage = getApiKeyUsage;
exports.createApiKey = createApiKey;
const connection_1 = __importDefault(require("../database/connection"));
const crypto_1 = __importDefault(require("crypto"));
function hashApiKey(apiKey) {
    return crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
}
function extractApiKey(request) {
    const authHeader = request.headers.authorization;
    const apiKeyHeader = request.headers['x-api-key'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    if (apiKeyHeader) {
        return apiKeyHeader;
    }
    return null;
}
async function apiKeyAuth(request, reply) {
    try {
        const apiKey = extractApiKey(request);
        if (!apiKey) {
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'API key is required. Provide it via Authorization header (Bearer token) or x-api-key header.',
                code: 'MISSING_API_KEY'
            });
        }
        const db = connection_1.default.getInstance().getDatabase();
        const apiKeyHash = hashApiKey(apiKey);
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
        const apiKeyInfo = stmt.get(apiKeyHash);
        if (!apiKeyInfo) {
            await logRequest(request, reply, null, 401, 'Invalid API key');
            return reply.status(401).send({
                error: 'Unauthorized',
                message: 'Invalid or inactive API key',
                code: 'INVALID_API_KEY'
            });
        }
        const currentDate = new Date();
        const resetDate = new Date(apiKeyInfo.usageResetDate);
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
        request.apiKeyInfo = apiKeyInfo;
    }
    catch (error) {
        console.error('API key authentication error:', error);
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Authentication service temporarily unavailable',
            code: 'AUTH_ERROR'
        });
    }
}
async function logRequest(request, reply, apiKeyId, statusCode, errorMessage) {
    try {
        const db = connection_1.default.getInstance().getDatabase();
        const startTime = request.startTime || Date.now();
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
        logStmt.run(apiKeyId, request.url, request.method, request.ip, request.headers['user-agent'] || null, request.method !== 'GET' ? JSON.stringify(request.body) : null, statusCode, responseTime, errorMessage || null);
        if (apiKeyId && statusCode < 400) {
            const updateStmt = db.prepare(`
        UPDATE api_keys 
        SET current_usage = current_usage + 1, updated_at = datetime('now')
        WHERE id = ?
      `);
            updateStmt.run(apiKeyId);
        }
    }
    catch (error) {
        console.error('Failed to log request:', error);
    }
}
function getApiKeyUsage(apiKeyId) {
    try {
        const db = connection_1.default.getInstance().getDatabase();
        const stmt = db.prepare(`
      SELECT 
        current_usage as currentUsage,
        monthly_limit as monthlyLimit,
        usage_reset_date as resetDate,
        tier
      FROM api_keys 
      WHERE id = ?
    `);
        return stmt.get(apiKeyId);
    }
    catch (error) {
        console.error('Failed to get API key usage:', error);
        return null;
    }
}
function createApiKey(tier, monthlyLimit) {
    try {
        const db = connection_1.default.getInstance().getDatabase();
        const apiKey = `dp_${crypto_1.default.randomBytes(32).toString('hex')}`;
        const apiKeyHash = hashApiKey(apiKey);
        const keyPrefix = `dp_${apiKey.substring(3, 8)}`;
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
        const result = stmt.run(apiKeyHash, keyPrefix, tier, finalMonthlyLimit, resetDate.toISOString());
        const apiKeyInfo = {
            id: result.lastInsertRowid,
            keyHash: apiKeyHash,
            keyPrefix,
            tier,
            monthlyLimit: finalMonthlyLimit,
            currentUsage: 0,
            usageResetDate: resetDate.toISOString(),
            isActive: true
        };
        return { apiKey, apiKeyInfo };
    }
    catch (error) {
        throw new Error(`Failed to create API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
//# sourceMappingURL=apiKeyAuth.js.map