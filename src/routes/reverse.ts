import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import DigiPinModel, { ReverseGeocodeRequest } from '../models/DigiPinModel';
import { apiKeyAuth, logRequest, AuthenticatedRequest } from '../middleware/apiKeyAuth';
import { tieredRateLimit } from '../middleware/rateLimiter';

export default async function reverseRoutes(fastify: FastifyInstance) {
  const digipinModel = new DigiPinModel();

  // Reverse geocode endpoint - Convert DigiPin to coordinates and address
  fastify.post('/v1/digipin/reverse', {
    schema: {
      description: 'Convert DigiPin code to coordinates and address',
      tags: ['Reverse Geocoding'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['digipin'],
        properties: {
          digipin: {
            type: 'string',
            description: 'The DigiPin code to reverse geocode'
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
                address: { type: 'string' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number' },
                    longitude: { type: 'number' }
                  }
                },
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
      const body = request.body as ReverseGeocodeRequest;
      
      if (!body.digipin || body.digipin.trim().length === 0) {
        statusCode = 400;
        errorMessage = 'DigiPin is required';
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'DigiPin is required',
          code: 'MISSING_DIGIPIN'
        });
      }

      const result = await digipinModel.reverseGeocode(body);

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
        code: 'REVERSE_GEOCODING_ERROR'
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
