import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import DigiPinModel, { GeocodeRequest } from '../models/DigiPinModel';
import { apiKeyAuth, logRequest, AuthenticatedRequest } from '../middleware/apiKeyAuth';
import { tieredRateLimit } from '../middleware/rateLimiter';

export default async function geocodeRoutes(fastify: FastifyInstance) {
  const digipinModel = new DigiPinModel();

  // Geocode endpoint - Convert address to DigiPin
  fastify.post('/v1/digipin/geocode', {
    schema: {
      description: 'Convert address to DigiPin code',
      tags: ['Geocoding'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['address'],
        properties: {
          address: {
            type: 'string',
            description: 'The address to geocode'
          },
          city: {
            type: 'string',
            description: 'City name (optional)'
          },
          state: {
            type: 'string',
            description: 'State name (optional)'
          },
          pincode: {
            type: 'string',
            description: 'Postal code (optional)'
          },
          country: {
            type: 'string',
            description: 'Country name (optional)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                digipin: { type: 'string' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number' },
                    longitude: { type: 'number' }
                  }
                },
                address: { type: 'string' },
                confidence: { type: 'number' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        },
        429: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    preHandler: [apiKeyAuth, tieredRateLimit]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const body = request.body as GeocodeRequest;
      
      if (!body.address || body.address.trim().length === 0) {
        statusCode = 400;
        errorMessage = 'Address is required';
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Address is required',
          code: 'MISSING_ADDRESS'
        });
      }

      const result = await digipinModel.geocode(body);

      return reply.send({
        success: true,
        data: result
      });

    } catch (error) {
      statusCode = 500;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: errorMessage,
        code: 'GEOCODING_ERROR'
      });
    } finally {
      // Log the request
      await logRequest(
        request,
        reply,
        (request as any).apiKeyInfo?.id || null,
        statusCode,
        errorMessage
      );
    }
  });

  // Coordinates to DigiPin endpoint - Convert lat/lon to DigiPin
  fastify.post('/v1/digipin/coordinates-to-digipin', {
    preHandler: [apiKeyAuth, tieredRateLimit],
    schema: {
      description: 'Convert coordinates (latitude/longitude) to DigiPin code',
      tags: ['Geocoding'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: {
            type: 'number',
            minimum: -90,
            maximum: 90,
            description: 'Latitude coordinate'
          },
          longitude: {
            type: 'number',
            minimum: -180,
            maximum: 180,
            description: 'Longitude coordinate'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                digipin: { type: 'string' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number' },
                    longitude: { type: 'number' }
                  }
                }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const body = request.body as { latitude: number; longitude: number };
      
      if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
        statusCode = 400;
        errorMessage = 'Latitude and longitude must be numbers';
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Latitude and longitude must be numbers',
          code: 'INVALID_COORDINATES'
        });
      }

      if (body.latitude < -90 || body.latitude > 90) {
        statusCode = 400;
        errorMessage = 'Latitude must be between -90 and 90';
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Latitude must be between -90 and 90',
          code: 'INVALID_LATITUDE'
        });
      }

      if (body.longitude < -180 || body.longitude > 180) {
        statusCode = 400;
        errorMessage = 'Longitude must be between -180 and 180';
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Longitude must be between -180 and 180',
          code: 'INVALID_LONGITUDE'
        });
      }

      const result = await digipinModel.coordinatesToDigiPin(body);

      return reply.send({
        success: true,
        data: result
      });

    } catch (error) {
      statusCode = 500;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: errorMessage,
        code: 'COORDINATES_TO_DIGIPIN_ERROR'
      });
    } finally {
      // Log the request
      await logRequest(
        request,
        reply,
        (request as any).apiKeyInfo?.id || null,
        statusCode,
        errorMessage
      );
    }
  });

  // Autocomplete endpoint - Get address suggestions
  fastify.get('/v1/digipin/autocomplete', {
    preHandler: [apiKeyAuth, tieredRateLimit],
    schema: {
      description: 'Get address autocomplete suggestions',
      tags: ['Geocoding'],
      security: [{ apiKey: [] }],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: {
            type: 'string',
            description: 'Search query (minimum 3 characters)',
            minLength: 3
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of suggestions (default: 5, max: 10)',
            minimum: 1,
            maximum: 10,
            default: 5
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  displayName: { type: 'string' },
                  address: { type: 'string' },
                  coordinates: {
                    type: 'object',
                    properties: {
                      latitude: { type: 'number' },
                      longitude: { type: 'number' }
                    }
                  },
                  confidence: { type: 'number' },
                  addressComponents: {
                    type: 'object',
                    properties: {
                      house_number: { type: 'string' },
                      road: { type: 'string' },
                      neighbourhood: { type: 'string' },
                      suburb: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      postcode: { type: 'string' },
                      country: { type: 'string' },
                      country_code: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const query = request.query as { q: string; limit?: number };
      
      if (!query.q || query.q.trim().length < 3) {
        statusCode = 400;
        errorMessage = 'Query parameter "q" is required and must be at least 3 characters';
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Query parameter "q" is required and must be at least 3 characters',
          code: 'INVALID_QUERY'
        });
      }

      const limit = Math.min(query.limit || 5, 10);
      const suggestions = await digipinModel.getAutocompleteSuggestions(query.q, limit);

      return reply.send({
        success: true,
        data: suggestions
      });

    } catch (error) {
      statusCode = 500;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: errorMessage,
        code: 'AUTOCOMPLETE_ERROR'
      });
    } finally {
      // Log the request
      await logRequest(
        request,
        reply,
        (request as any).apiKeyInfo?.id || null,
        statusCode,
        errorMessage
      );
    }
  });
}
