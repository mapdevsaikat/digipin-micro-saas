import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import DigiPinModel, { GeocodeRequest } from '../models/DigiPinModel';
import { apiKeyAuth, logRequest, AuthenticatedRequest } from '../middleware/apiKeyAuth';
import { tieredRateLimit } from '../middleware/rateLimiter';

export default async function geocodeRoutes(fastify: FastifyInstance) {
  const digipinModel = new DigiPinModel();

  // Geocode endpoint - Convert address to DigiPin
  fastify.post('/v1/geocode', {
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
  fastify.post('/v1/coordinates-to-digipin', {
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
}
