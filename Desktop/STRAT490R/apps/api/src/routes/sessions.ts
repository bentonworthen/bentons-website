import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { mockDb as db } from '../database/mock-db';
import { authenticate } from '../middleware/auth';

const createSessionSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  sources: z.object({
    screen: z.boolean().default(false),
    audio: z.boolean().default(false),
    windows: z.array(z.string()).default([]),
  }),
  consentFlags: z.object({
    screenRecording: z.boolean(),
    audioRecording: z.boolean(),
    keystrokeCapture: z.boolean().default(false),
  }),
});

const addEventSchema = z.object({
  timestamp: z.string().datetime(),
  type: z.enum(['asr_transcript', 'asr_word', 'ui_click', 'ui_input_meta', 'window_focus', 'app_launch', 'net_change', 'ocr_text', 'user_note', 'privacy_pause', 'privacy_resume']),
  payload: z.any(),
  speakerTag: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

const endSessionSchema = z.object({
  mediaUris: z.array(z.string()).optional(),
  duration: z.number().optional(),
});

export const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // Create new session
  fastify.post('/', async (request, reply) => {
    try {
      const data = createSessionSchema.parse(request.body);

      const [session] = await db.insert(sessions).values({
        tenantId: request.user!.tenantId,
        agentId: request.user!.id,
        customerId: data.customerId,
        customerName: data.customerName,
        sources: data.sources,
        consentFlags: data.consentFlags,
        status: 'recording',
      }).returning();

      // Log session creation
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'session_created',
        resourceType: 'session',
        resourceId: session.id,
        ipAddress: request.ip,
        metadata: { customerId: data.customerId },
      });

      reply.send(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get sessions
  fastify.get('/', async (request, reply) => {
    try {
      const sessionList = db.findSessionsByTenant(request.user!.tenantId);

      // Enrich with agent data
      const enrichedSessions = sessionList.map(session => {
        const agent = db.findUserById(session.agentId);
        return {
          ...session,
          agent: agent ? {
            id: agent.id,
            name: agent.name,
            email: agent.email,
          } : null,
        };
      });

      reply.send(enrichedSessions);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specific session
  fastify.get('/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };

      const session = await db.query.sessions.findFirst({
        where: and(
          eq(sessions.id, sessionId),
          eq(sessions.tenantId, request.user!.tenantId)
        ),
        with: {
          agent: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          events: {
            orderBy: [events.timestamp],
          },
        },
      });

      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      reply.send(session);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add event to session
  fastify.post('/:sessionId/events', async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      const eventData = addEventSchema.parse(request.body);

      // Verify session exists and belongs to tenant
      const session = await db.query.sessions.findFirst({
        where: and(
          eq(sessions.id, sessionId),
          eq(sessions.tenantId, request.user!.tenantId)
        ),
      });

      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      if (session.status !== 'recording') {
        return reply.code(400).send({ error: 'Session is not in recording state' });
      }

      const [event] = await db.insert(events).values({
        sessionId,
        timestamp: new Date(eventData.timestamp),
        type: eventData.type,
        payload: eventData.payload,
        speakerTag: eventData.speakerTag,
        confidence: eventData.confidence,
      }).returning();

      reply.send(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // End session
  fastify.patch('/:sessionId/end', async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      const data = endSessionSchema.parse(request.body);

      // Verify session exists and belongs to tenant
      const session = await db.query.sessions.findFirst({
        where: and(
          eq(sessions.id, sessionId),
          eq(sessions.tenantId, request.user!.tenantId)
        ),
      });

      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      const [updatedSession] = await db.update(sessions)
        .set({
          status: 'processing',
          endedAt: new Date(),
          mediaUris: data.mediaUris,
          duration: data.duration,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId))
        .returning();

      // Log session end
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'session_ended',
        resourceType: 'session',
        resourceId: sessionId,
        ipAddress: request.ip,
        metadata: { duration: data.duration },
      });

      reply.send(updatedSession);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // WebSocket endpoint for real-time event streaming
  fastify.register(async function (fastify) {
    fastify.get('/:sessionId/stream', { websocket: true }, (connection, req) => {
      const { sessionId } = req.params as { sessionId: string };

      connection.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'event') {
            // In a real implementation, you'd validate the event and store it
            // For now, just echo it back to all connected clients
            connection.send(JSON.stringify({
              type: 'event_ack',
              eventId: data.eventId,
              timestamp: new Date().toISOString(),
            }));
          }
        } catch (error) {
          fastify.log.error('WebSocket message error:', error);
        }
      });

      connection.on('close', () => {
        fastify.log.info(`WebSocket connection closed for session ${sessionId}`);
      });
    });
  });
};