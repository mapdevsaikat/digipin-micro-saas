import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import DigiPin from 'digipin';
import { apiKeyAuth, logRequest } from '../middleware/apiKeyAuth';
import { tieredRateLimit } from '../middleware/rateLimiter';

export default async function officialCompatibilityRoutes(fastify: FastifyInstance) {
  
  // Official-style encode endpoint - Convert coordinates to DigiPin
  fastify.get('/api/digipin/encode', {
    preHandler: [apiKeyAuth, tieredRateLimit],
    schema: {
      description: 'Convert latitude and longitude to DIGIPIN (Official API Compatible)',
      tags: ['Official Compatibility'],
      security: [{ apiKey: [] }],
      querystring: {
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
            digipin: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const query = request.query as { latitude: number; longitude: number };
      
      if (typeof query.latitude !== 'number' || typeof query.longitude !== 'number') {
        statusCode = 400;
        errorMessage = 'Latitude and longitude must be numbers';
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Latitude and longitude must be numbers'
        });
      }

      if (query.latitude < -90 || query.latitude > 90) {
        statusCode = 400;
        errorMessage = 'Latitude must be between -90 and 90';
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Latitude must be between -90 and 90'
        });
      }

      if (query.longitude < -180 || query.longitude > 180) {
        statusCode = 400;
        errorMessage = 'Longitude must be between -180 and 180';
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Longitude must be between -180 and 180'
        });
      }

      // Use DigiPin library to generate DigiPin from coordinates
      const digipin = DigiPin.getDIGIPINFromLatLon(query.latitude, query.longitude);

      if (!digipin || digipin === "Invalid coordinates") {
        statusCode = 400;
        errorMessage = 'Invalid coordinates provided';
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Unable to generate DigiPin from the provided coordinates'
        });
      }

      // Official-style response format
      return reply.send({
        digipin: digipin
      });

    } catch (error) {
      statusCode = 500;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: errorMessage
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

  // Official-style decode endpoint - Convert DigiPin to coordinates
  fastify.get('/api/digipin/decode', {
    preHandler: [apiKeyAuth, tieredRateLimit],
    schema: {
      description: 'Convert DIGIPIN to latitude and longitude (Official API Compatible)',
      tags: ['Official Compatibility'],
      security: [{ apiKey: [] }],
      querystring: {
        type: 'object',
        required: ['digipin'],
        properties: {
          digipin: {
            type: 'string',
            description: 'The DigiPin code to decode'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            latitude: { type: 'string' },
            longitude: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const query = request.query as { digipin: string };
      
      if (!query.digipin || query.digipin.trim().length === 0) {
        statusCode = 400;
        errorMessage = 'DigiPin is required';
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'DigiPin is required'
        });
      }

      // Use DigiPin library for reverse geocoding
      const result = DigiPin.getLatLonFromDIGIPIN(query.digipin.trim());
      
      if (result === "Invalid DIGIPIN") {
        statusCode = 400;
        errorMessage = 'Invalid DigiPin format';
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid DigiPin format'
        });
      }

      // Official-style response format (coordinates as strings)
      return reply.send({
        latitude: result.latitude.toString(),
        longitude: result.longitude.toString()
      });

    } catch (error) {
      statusCode = 500;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: errorMessage
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
