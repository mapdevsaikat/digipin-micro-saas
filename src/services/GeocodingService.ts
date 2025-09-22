import https from 'https';
import http from 'http';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
  confidence: number;
  displayName: string;
  addressComponents: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  importance: number;
  placeRank: number;
}

export interface ReverseGeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  confidence: number;
  displayName: string;
  addressComponents: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

class GeocodingService {
  private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
  private readonly userAgent = 'DigiPin-MicroSaaS/1.0';

  /**
   * Make HTTP request to Nominatim API
   */
  private async makeRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      const req = protocol.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Calculate confidence score based on Nominatim's importance and place_rank
   */
  private calculateConfidence(importance: number, placeRank: number): number {
    // Importance is typically between 0 and 1, place_rank is between 1 and 30
    // Lower place_rank means higher importance
    const importanceScore = Math.min(importance * 100, 100);
    const rankScore = Math.max(0, (30 - placeRank) / 30 * 100);
    
    // Weighted average: importance matters more
    const confidence = (importanceScore * 0.7 + rankScore * 0.3) / 100;
    
    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Geocode an address using Nominatim
   */
  async geocode(address: string, city?: string, state?: string, pincode?: string, country?: string): Promise<GeocodeResult[]> {
    try {
      // Build search query
      let searchQuery = address.trim();
      
      if (city) searchQuery += `, ${city}`;
      if (state) searchQuery += `, ${state}`;
      if (pincode) searchQuery += `, ${pincode}`;
      if (country) searchQuery += `, ${country}`;

      // URL encode the query
      const encodedQuery = encodeURIComponent(searchQuery);
      
      // Build API URL with detailed address breakdown
      const url = `${this.nominatimBaseUrl}/search?` +
        `q=${encodedQuery}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `extratags=1&` +
        `namedetails=1`;

      const response = await this.makeRequest(url);

      if (!Array.isArray(response) || response.length === 0) {
        return [];
      }

      // Process results and sort by confidence
      const results: GeocodeResult[] = response.map((item: any) => {
        const importance = parseFloat(item.importance) || 0;
        const placeRank = parseInt(item.place_rank) || 30;
        const confidence = this.calculateConfidence(importance, placeRank);

        return {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          address: item.display_name,
          confidence,
          displayName: item.display_name,
          addressComponents: {
            house_number: item.address?.house_number,
            road: item.address?.road,
            neighbourhood: item.address?.neighbourhood,
            suburb: item.address?.suburb,
            city: item.address?.city || item.address?.town || item.address?.village,
            state: item.address?.state,
            postcode: item.address?.postcode,
            country: item.address?.country,
            country_code: item.address?.country_code
          },
          importance,
          placeRank
        };
      });

      // Sort by confidence (highest first)
      return results.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      throw new Error(`Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reverse geocode coordinates using Nominatim
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    try {
      // Build API URL
      const url = `${this.nominatimBaseUrl}/reverse?` +
        `lat=${latitude}&` +
        `lon=${longitude}&` +
        `format=json&` +
        `addressdetails=1&` +
        `extratags=1&` +
        `namedetails=1`;

      const response = await this.makeRequest(url);

      if (!response || !response.display_name) {
        throw new Error('No address found for the given coordinates');
      }

      const importance = parseFloat(response.importance) || 0;
      const placeRank = parseInt(response.place_rank) || 30;
      const confidence = this.calculateConfidence(importance, placeRank);

      return {
        address: response.display_name,
        latitude: parseFloat(response.lat),
        longitude: parseFloat(response.lon),
        confidence,
        displayName: response.display_name,
        addressComponents: {
          house_number: response.address?.house_number,
          road: response.address?.road,
          neighbourhood: response.address?.neighbourhood,
          suburb: response.address?.suburb,
          city: response.address?.city || response.address?.town || response.address?.village,
          state: response.address?.state,
          postcode: response.address?.postcode,
          country: response.address?.country,
          country_code: response.address?.country_code
        }
      };

    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get auto-complete suggestions for an address
   */
  async getAutocompleteSuggestions(query: string, limit: number = 5): Promise<GeocodeResult[]> {
    try {
      if (!query || query.trim().length < 3) {
        return [];
      }

      const encodedQuery = encodeURIComponent(query.trim());
      
      const url = `${this.nominatimBaseUrl}/search?` +
        `q=${encodedQuery}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=${limit}&` +
        `extratags=1&` +
        `namedetails=1`;

      const response = await this.makeRequest(url);

      if (!Array.isArray(response)) {
        return [];
      }

      // Process and rank results
      const results: GeocodeResult[] = response.map((item: any) => {
        const importance = parseFloat(item.importance) || 0;
        const placeRank = parseInt(item.place_rank) || 30;
        const confidence = this.calculateConfidence(importance, placeRank);

        return {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          address: item.display_name,
          confidence,
          displayName: item.display_name,
          addressComponents: {
            house_number: item.address?.house_number,
            road: item.address?.road,
            neighbourhood: item.address?.neighbourhood,
            suburb: item.address?.suburb,
            city: item.address?.city || item.address?.town || item.address?.village,
            state: item.address?.state,
            postcode: item.address?.postcode,
            country: item.address?.country,
            country_code: item.address?.country_code
          },
          importance,
          placeRank
        };
      });

      // Sort by confidence and importance
      return results.sort((a, b) => {
        // Primary sort by confidence
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        // Secondary sort by importance
        return b.importance - a.importance;
      });

    } catch (error) {
      throw new Error(`Autocomplete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default GeocodingService;
