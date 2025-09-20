import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import DigiPinModel, { BatchGeocodeRequest } from '../models/DigiPinModel';
import { apiKeyAuth, logRequest, AuthenticatedRequest } from '../middleware/apiKeyAuth';
import { tieredRateLimit, burstRateLimit } from '../middleware/rateLimiter';

export default async function batchRoutes(fastify: FastifyInstance) {
  const digipinModel = new DigiPinModel();

  // Batch geocode endpoint - Process multiple addresses
  fastify.post('/v1/batch', {
    schema: {
      description: 'Process multiple geocoding requests in batch',
      tags: ['Geocoding'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['addresses'],
        properties: {
          addresses: {
            type: 'array',
            description: 'Array of addresses to geocode',
            maxItems: 100,
            items: {
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
            }
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
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      input: {
                        type: 'object',
                        properties: {
                          address: { type: 'string' },
                          city: { type: 'string' },
                          state: { type: 'string' },
                          pincode: { type: 'string' },
                          country: { type: 'string' }
                        }
                      },
                      result: {
                        oneOf: [
                          {
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
                          },
                          {
                            type: 'object',
                            properties: {
                              error: { type: 'string' }
                            }
                          }
                        ]
                      }
                    }
                  }
                },
                totalProcessed: { type: 'number' },
                successCount: { type: 'number' },
                errorCount: { type: 'number' }
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
      const body = request.body as BatchGeocodeRequest;
      
      if (!body.addresses || !Array.isArray(body.addresses) || body.addresses.length === 0) {
        statusCode = 400;
        errorMessage = 'Addresses array is required and must not be empty';
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Addresses array is required and must not be empty',
          code: 'MISSING_ADDRESSES'
        });
      }

      if (body.addresses.length > 100) {
        statusCode = 400;
        errorMessage = 'Maximum 100 addresses allowed per batch request';
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Maximum 100 addresses allowed per batch request',
          code: 'BATCH_SIZE_EXCEEDED'
        });
      }

      // Apply burst rate limiting
      await burstRateLimit(request, reply, body.addresses.length);

      const result = await digipinModel.batchGeocode(body);

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
        code: 'BATCH_GEOCODING_ERROR'
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
