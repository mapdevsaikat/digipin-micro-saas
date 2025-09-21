import DigiPin from 'digipin';
import Database from 'better-sqlite3';
import DatabaseConnection from '../database/connection';
import crypto from 'crypto';

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
    result: GeocodeResponse | { error: string };
  }>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

class DigiPinModel {
  private db: Database.Database;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();

  constructor() {
    this.db = DatabaseConnection.getInstance().getDatabase();
  }

  /**
   * Generate a cache key for the given input
   */
  private generateCacheKey(type: string, input: any): string {
    const inputString = JSON.stringify(input);
    return crypto.createHash('md5').update(`${type}:${inputString}`).digest('hex');
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult<T>(cacheKey: string): T | null {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      return null;
    }
    return this.cache.get(cacheKey) || null;
  }

  /**
   * Set cache result with expiry
   */
  private setCachedResult<T>(cacheKey: string, result: T, ttlMinutes: number = 60): void {
    this.cache.set(cacheKey, result);
    this.cacheExpiry.set(cacheKey, Date.now() + (ttlMinutes * 60 * 1000));
  }

  /**
   * Convert address to DigiPin code
   */
  public async geocode(request: GeocodeRequest): Promise<GeocodeResponse> {
    try {
      // Validate input
      if (!request.address || request.address.trim().length === 0) {
        throw new Error('Address is required');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey('geocode', request);
      const cachedResult = this.getCachedResult<GeocodeResponse>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Build address string
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

      // Since we only have address, we need to geocode it first to get coordinates
      // For now, we'll use a mock geocoding service to get coordinates
      // In production, integrate with Google Maps, OpenStreetMap, or similar service
      const mockCoordinates = {
        latitude: 28.6139 + (Math.random() - 0.5) * 0.1, // Mock coordinates around Delhi
        longitude: 77.2090 + (Math.random() - 0.5) * 0.1
      };

      // Now use the DigiPin library to generate real DigiPin from coordinates
      const digipin = DigiPin.getDIGIPINFromLatLon(mockCoordinates.latitude, mockCoordinates.longitude);
      
      const result = {
        digipin: digipin,
        latitude: mockCoordinates.latitude,
        longitude: mockCoordinates.longitude,
        address: addressString,
        confidence: 0.8
      };

      if (!result || !result.digipin) {
        throw new Error('Unable to geocode the provided address');
      }

      const response: GeocodeResponse = {
        digipin: result.digipin,
        coordinates: {
          latitude: result.latitude,
          longitude: result.longitude
        },
        address: result.address || addressString,
        confidence: result.confidence || 0.8
      };

      // Cache the result
      this.setCachedResult(cacheKey, response, 60); // Cache for 1 hour

      // Store in database cache
      this.storeInDatabaseCache('geocode', request, response);

      return response;
    } catch (error) {
      throw new Error(`Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert coordinates to DigiPin code
   */
  public async coordinatesToDigiPin(request: { latitude: number; longitude: number }): Promise<{ digipin: string; coordinates: { latitude: number; longitude: number } }> {
    try {
      // Validate input
      if (typeof request.latitude !== 'number' || typeof request.longitude !== 'number') {
        throw new Error('Latitude and longitude must be numbers');
      }

      if (request.latitude < -90 || request.latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }

      if (request.longitude < -180 || request.longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey('coordinates-to-digipin', request);
      const cachedResult = this.getCachedResult<{ digipin: string; coordinates: { latitude: number; longitude: number } }>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Use DigiPin library to generate DigiPin from coordinates
      const digipin = DigiPin.getDIGIPINFromLatLon(request.latitude, request.longitude);

      if (!digipin || digipin === "Invalid coordinates") {
        throw new Error('Unable to generate DigiPin from the provided coordinates');
      }

      const response = {
        digipin: digipin,
        coordinates: {
          latitude: request.latitude,
          longitude: request.longitude
        }
      };

      // Cache the result
      this.setCachedResult(cacheKey, response, 60); // Cache for 1 hour

      // Store in database cache
      this.storeInDatabaseCache('coordinates-to-digipin', request, response);

      return response;
    } catch (error) {
      throw new Error(`Coordinates to DigiPin conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert DigiPin code to coordinates and address
   */
  public async reverseGeocode(request: ReverseGeocodeRequest): Promise<ReverseGeocodeResponse> {
    try {
      // Validate input
      if (!request.digipin || request.digipin.trim().length === 0) {
        throw new Error('DigiPin is required');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey('reverse', request);
      const cachedResult = this.getCachedResult<ReverseGeocodeResponse>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Use DigiPin library for reverse geocoding
      const digipinResult = DigiPin.getLatLonFromDIGIPIN(request.digipin.trim());
      
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

      const response: ReverseGeocodeResponse = {
        address: result.address,
        coordinates: {
          latitude: result.latitude,
          longitude: result.longitude
        },
        confidence: result.confidence || 0.8
      };

      // Cache the result
      this.setCachedResult(cacheKey, response, 60); // Cache for 1 hour

      // Store in database cache
      this.storeInDatabaseCache('reverse', request, response);

      return response;
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate DigiPin format
   */
  public async validate(digipin: string): Promise<ValidationResponse> {
    try {
      if (!digipin || digipin.trim().length === 0) {
        return {
          isValid: false,
          digipin: digipin || '',
          errors: ['DigiPin is required']
        };
      }

      // Check cache first
      const cacheKey = this.generateCacheKey('validate', { digipin });
      const cachedResult = this.getCachedResult<ValidationResponse>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const cleanDigiPin = digipin.trim();
      const errors: string[] = [];

      // Basic format validation
      if (cleanDigiPin.length < 6 || cleanDigiPin.length > 20) {
        errors.push('DigiPin must be between 6 and 20 characters long');
      }

      // Check for valid characters (alphanumeric and some special chars)
      if (!/^[A-Za-z0-9\-_]+$/.test(cleanDigiPin)) {
        errors.push('DigiPin can only contain alphanumeric characters, hyphens, and underscores');
      }

      // Try to reverse geocode to validate if it's a real DigiPin
      let isValidDigiPin = errors.length === 0;
      if (isValidDigiPin) {
        try {
          const digipinResult = DigiPin.getLatLonFromDIGIPIN(cleanDigiPin);
          if (digipinResult === "Invalid DIGIPIN") {
            isValidDigiPin = false;
            errors.push('DigiPin does not correspond to a valid location');
          }
        } catch (error) {
          isValidDigiPin = false;
          errors.push('DigiPin does not correspond to a valid location');
        }
      }

      const response: ValidationResponse = {
        isValid: isValidDigiPin,
        digipin: cleanDigiPin,
        errors: errors.length > 0 ? errors : undefined
      };

      // Cache the result
      this.setCachedResult(cacheKey, response, 30); // Cache for 30 minutes

      // Store in database cache
      this.storeInDatabaseCache('validate', { digipin }, response);

      return response;
    } catch (error) {
      return {
        isValid: false,
        digipin: digipin || '',
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Process multiple geocoding requests in batch
   */
  public async batchGeocode(request: BatchGeocodeRequest): Promise<BatchGeocodeResponse> {
    try {
      if (!request.addresses || request.addresses.length === 0) {
        throw new Error('Addresses array is required');
      }

      if (request.addresses.length > 100) {
        throw new Error('Maximum 100 addresses allowed per batch request');
      }

      const results: Array<{
        input: GeocodeRequest;
        result: GeocodeResponse | { error: string };
      }> = [];

      let successCount = 0;
      let errorCount = 0;

      // Process each address
      for (const address of request.addresses) {
        try {
          const result = await this.geocode(address);
          results.push({
            input: address,
            result
          });
          successCount++;
        } catch (error) {
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
    } catch (error) {
      throw new Error(`Batch geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store result in database cache
   */
  private storeInDatabaseCache(type: string, input: any, output: any): void {
    try {
      const cacheKey = this.generateCacheKey(type, input);
      const expiresAt = new Date(Date.now() + (60 * 60 * 1000)).toISOString(); // 1 hour

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO digipin_cache 
        (cache_key, cache_type, input_data, output_data, expires_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);

      stmt.run(
        cacheKey,
        type,
        JSON.stringify(input),
        JSON.stringify(output),
        expiresAt
      );
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to store in database cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { memoryCacheSize: number; databaseCacheSize: number } {
    const databaseCacheSize = this.db.prepare('SELECT COUNT(*) as count FROM digipin_cache').get() as { count: number };
    
    return {
      memoryCacheSize: this.cache.size,
      databaseCacheSize: databaseCacheSize.count
    };
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    // Clear memory cache
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (Date.now() > expiry) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }

    // Clear database cache
    try {
      const stmt = this.db.prepare('DELETE FROM digipin_cache WHERE expires_at < datetime("now")');
      const result = stmt.run();
      if (result.changes > 0) {
        console.log(`Cleared ${result.changes} expired cache entries`);
      }
    } catch (error) {
      console.error('Failed to clear expired database cache:', error);
    }
  }
}

export default DigiPinModel;
