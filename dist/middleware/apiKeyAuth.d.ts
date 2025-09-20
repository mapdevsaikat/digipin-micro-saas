import { FastifyRequest, FastifyReply } from 'fastify';
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
export declare function hashApiKey(apiKey: string): string;
export declare function apiKeyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function logRequest(request: FastifyRequest, reply: FastifyReply, apiKeyId: number | null, statusCode: number, errorMessage?: string): Promise<void>;
export declare function getApiKeyUsage(apiKeyId: number): {
    currentUsage: number;
    monthlyLimit: number;
    resetDate: string;
    tier: string;
} | null;
export declare function createApiKey(tier: 'free' | 'paid' | 'enterprise', monthlyLimit?: number): {
    apiKey: string;
    apiKeyInfo: ApiKeyInfo;
};
//# sourceMappingURL=apiKeyAuth.d.ts.map