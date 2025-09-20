"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const digipin_1 = __importDefault(require("digipin"));
const connection_1 = __importDefault(require("../database/connection"));
const crypto_1 = __importDefault(require("crypto"));
class DigiPinModel {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.db = connection_1.default.getInstance().getDatabase();
    }
    generateCacheKey(type, input) {
        const inputString = JSON.stringify(input);
        return crypto_1.default.createHash('md5').update(`${type}:${inputString}`).digest('hex');
    }
    getCachedResult(cacheKey) {
        const expiry = this.cacheExpiry.get(cacheKey);
        if (expiry && Date.now() > expiry) {
            this.cache.delete(cacheKey);
            this.cacheExpiry.delete(cacheKey);
            return null;
        }
        return this.cache.get(cacheKey) || null;
    }
    setCachedResult(cacheKey, result, ttlMinutes = 60) {
        this.cache.set(cacheKey, result);
        this.cacheExpiry.set(cacheKey, Date.now() + (ttlMinutes * 60 * 1000));
    }
    async geocode(request) {
        try {
            if (!request.address || request.address.trim().length === 0) {
                throw new Error('Address is required');
            }
            const cacheKey = this.generateCacheKey('geocode', request);
            const cachedResult = this.getCachedResult(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
            let addressString = request.address.trim();
            if (request.city) {
                addressString += `, ${request.city}`;
            }
            if (request.state) {
                addressString += `, ${request.state}`;
            }
            if (request.pincode) {
                addressString += `, ${request.pincode}`;
            }
            if (request.country) {
                addressString += `, ${request.country}`;
            }
            const result = {
                digipin: `MOCK_${Math.random().toString(36).substring(2, 15)}`,
                latitude: 28.6139 + (Math.random() - 0.5) * 0.1,
                longitude: 77.2090 + (Math.random() - 0.5) * 0.1,
                address: addressString,
                confidence: 0.8
            };
            if (!result || !result.digipin) {
                throw new Error('Unable to geocode the provided address');
            }
            const response = {
                digipin: result.digipin,
                coordinates: {
                    latitude: result.latitude,
                    longitude: result.longitude
                },
                address: result.address || addressString,
                confidence: result.confidence || 0.8
            };
            this.setCachedResult(cacheKey, response, 60);
            this.storeInDatabaseCache('geocode', request, response);
            return response;
        }
        catch (error) {
            throw new Error(`Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async reverseGeocode(request) {
        try {
            if (!request.digipin || request.digipin.trim().length === 0) {
                throw new Error('DigiPin is required');
            }
            const cacheKey = this.generateCacheKey('reverse', request);
            const cachedResult = this.getCachedResult(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
            const digipinResult = digipin_1.default.getLatLonFromDIGIPIN(request.digipin.trim());
            if (digipinResult === "Invalid DIGIPIN") {
                throw new Error('Invalid DigiPin format');
            }
            const result = {
                address: `Mock address for ${request.digipin}`,
                latitude: digipinResult.latitude,
                longitude: digipinResult.longitude,
                confidence: 0.8
            };
            if (!result || !result.address) {
                throw new Error('Unable to reverse geocode the provided DigiPin');
            }
            const response = {
                address: result.address,
                coordinates: {
                    latitude: result.latitude,
                    longitude: result.longitude
                },
                confidence: result.confidence || 0.8
            };
            this.setCachedResult(cacheKey, response, 60);
            this.storeInDatabaseCache('reverse', request, response);
            return response;
        }
        catch (error) {
            throw new Error(`Reverse geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async validate(digipin) {
        try {
            if (!digipin || digipin.trim().length === 0) {
                return {
                    isValid: false,
                    digipin: digipin || '',
                    errors: ['DigiPin is required']
                };
            }
            const cacheKey = this.generateCacheKey('validate', { digipin });
            const cachedResult = this.getCachedResult(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
            const cleanDigiPin = digipin.trim();
            const errors = [];
            if (cleanDigiPin.length < 6 || cleanDigiPin.length > 20) {
                errors.push('DigiPin must be between 6 and 20 characters long');
            }
            if (!/^[A-Za-z0-9\-_]+$/.test(cleanDigiPin)) {
                errors.push('DigiPin can only contain alphanumeric characters, hyphens, and underscores');
            }
            let isValidDigiPin = errors.length === 0;
            if (isValidDigiPin) {
                try {
                    const digipinResult = digipin_1.default.getLatLonFromDIGIPIN(cleanDigiPin);
                    if (digipinResult === "Invalid DIGIPIN") {
                        isValidDigiPin = false;
                        errors.push('DigiPin does not correspond to a valid location');
                    }
                }
                catch (error) {
                    isValidDigiPin = false;
                    errors.push('DigiPin does not correspond to a valid location');
                }
            }
            const response = {
                isValid: isValidDigiPin,
                digipin: cleanDigiPin,
                errors: errors.length > 0 ? errors : undefined
            };
            this.setCachedResult(cacheKey, response, 30);
            this.storeInDatabaseCache('validate', { digipin }, response);
            return response;
        }
        catch (error) {
            return {
                isValid: false,
                digipin: digipin || '',
                errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }
    async batchGeocode(request) {
        try {
            if (!request.addresses || request.addresses.length === 0) {
                throw new Error('Addresses array is required');
            }
            if (request.addresses.length > 100) {
                throw new Error('Maximum 100 addresses allowed per batch request');
            }
            const results = [];
            let successCount = 0;
            let errorCount = 0;
            for (const address of request.addresses) {
                try {
                    const result = await this.geocode(address);
                    results.push({
                        input: address,
                        result
                    });
                    successCount++;
                }
                catch (error) {
                    results.push({
                        input: address,
                        result: {
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }
                    });
                    errorCount++;
                }
            }
            return {
                results,
                totalProcessed: request.addresses.length,
                successCount,
                errorCount
            };
        }
        catch (error) {
            throw new Error(`Batch geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    storeInDatabaseCache(type, input, output) {
        try {
            const cacheKey = this.generateCacheKey(type, input);
            const expiresAt = new Date(Date.now() + (60 * 60 * 1000)).toISOString();
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO digipin_cache 
        (cache_key, cache_type, input_data, output_data, expires_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);
            stmt.run(cacheKey, type, JSON.stringify(input), JSON.stringify(output), expiresAt);
        }
        catch (error) {
            console.error('Failed to store in database cache:', error);
        }
    }
    getCacheStats() {
        const databaseCacheSize = this.db.prepare('SELECT COUNT(*) as count FROM digipin_cache').get();
        return {
            memoryCacheSize: this.cache.size,
            databaseCacheSize: databaseCacheSize.count
        };
    }
    clearExpiredCache() {
        for (const [key, expiry] of this.cacheExpiry.entries()) {
            if (Date.now() > expiry) {
                this.cache.delete(key);
                this.cacheExpiry.delete(key);
            }
        }
        try {
            const stmt = this.db.prepare('DELETE FROM digipin_cache WHERE expires_at < datetime("now")');
            const result = stmt.run();
            if (result.changes > 0) {
                console.log(`Cleared ${result.changes} expired cache entries`);
            }
        }
        catch (error) {
            console.error('Failed to clear expired database cache:', error);
        }
    }
}
exports.default = DigiPinModel;
//# sourceMappingURL=DigiPinModel.js.map