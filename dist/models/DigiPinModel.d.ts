export interface GeocodeRequest {
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
}
export interface GeocodeResponse {
    digipin: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    address: string;
    confidence: number;
}
export interface ReverseGeocodeRequest {
    digipin: string;
}
export interface ReverseGeocodeResponse {
    address: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    confidence: number;
}
export interface ValidationResponse {
    isValid: boolean;
    digipin: string;
    errors?: string[];
}
export interface BatchGeocodeRequest {
    addresses: GeocodeRequest[];
}
export interface BatchGeocodeResponse {
    results: Array<{
        input: GeocodeRequest;
        result: GeocodeResponse | {
            error: string;
        };
    }>;
    totalProcessed: number;
    successCount: number;
    errorCount: number;
}
declare class DigiPinModel {
    private db;
    private cache;
    private cacheExpiry;
    constructor();
    private generateCacheKey;
    private getCachedResult;
    private setCachedResult;
    geocode(request: GeocodeRequest): Promise<GeocodeResponse>;
    reverseGeocode(request: ReverseGeocodeRequest): Promise<ReverseGeocodeResponse>;
    validate(digipin: string): Promise<ValidationResponse>;
    batchGeocode(request: BatchGeocodeRequest): Promise<BatchGeocodeResponse>;
    private storeInDatabaseCache;
    getCacheStats(): {
        memoryCacheSize: number;
        databaseCacheSize: number;
    };
    clearExpiredCache(): void;
}
export default DigiPinModel;
//# sourceMappingURL=DigiPinModel.d.ts.map