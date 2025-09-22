import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import DigiPinModel from '../models/DigiPinModel';
import { apiKeyAuth, logRequest, AuthenticatedRequest } from '../middleware/apiKeyAuth';
import { tieredRateLimit } from '../middleware/rateLimiter';

export default async function validateRoutes(fastify: FastifyInstance) {
  const digipinModel = new DigiPinModel();

  // Validate DigiPin endpoint
  fastify.get('/v1/digipin/validate/:digipin', {
    schema: {
      description: 'Validate DigiPin format and check if it corresponds to a real location',
      tags: ['Validation'],
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        required: ['digipin'],
        properties: {
          digipin: {
            type: 'string',
            description: 'The DigiPin code to validate'
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
                isValid: { type: 'boolean' },
                digipin: { type: 'string' },
                errors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of validation errors (only present if isValid is false)'
                }
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
      const params = request.params as { digipin: string };
      const digipin = params.digipin;
      
      if (!digipin || digipin.trim().length === 0) {
        statusCode = 400;
        errorMessage = 'DigiPin parameter is required';
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'DigiPin parameter is required',
          code: 'MISSING_DIGIPIN_PARAM'
        });
      }

      const result = await digipinModel.validate(digipin.trim());

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
        code: 'VALIDATION_ERROR'
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
