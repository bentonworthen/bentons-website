import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, snippets, auditLogs } from '@reportify/database';
import { eq, and, desc, ilike, or } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

const createSnippetSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const updateSnippetSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const snippetRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // Create snippet
  fastify.post('/', async (request, reply) => {
    try {
      const data = createSnippetSchema.parse(request.body);

      const [snippet] = await db.insert(snippets).values({
        tenantId: request.user!.tenantId,
        createdBy: request.user!.id,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags,
      }).returning();

      // Log snippet creation
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'snippet_created',
        resourceType: 'snippet',
        resourceId: snippet.id,
        ipAddress: request.ip,
      });

      reply.send(snippet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get snippets
  fastify.get('/', async (request, reply) => {
    try {
      const { search, category } = request.query as { search?: string; category?: string };

      let whereConditions = [eq(snippets.tenantId, request.user!.tenantId), eq(snippets.isActive, true)];

      if (search) {
        whereConditions.push(
          or(
            ilike(snippets.title, `%${search}%`),
            ilike(snippets.content, `%${search}%`)
          )!
        );
      }

      if (category) {
        whereConditions.push(eq(snippets.category, category));
      }

      const snippetList = await db.query.snippets.findMany({
        where: and(...whereConditions),
        orderBy: [desc(snippets.usageCount), desc(snippets.createdAt)],
        with: {
          createdByUser: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      reply.send(snippetList);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specific snippet
  fastify.get('/:snippetId', async (request, reply) => {
    try {
      const { snippetId } = request.params as { snippetId: string };

      const snippet = await db.query.snippets.findFirst({
        where: and(
          eq(snippets.id, snippetId),
          eq(snippets.tenantId, request.user!.tenantId)
        ),
        with: {
          createdByUser: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!snippet) {
        return reply.code(404).send({ error: 'Snippet not found' });
      }

      reply.send(snippet);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update snippet
  fastify.patch('/:snippetId', async (request, reply) => {
    try {
      const { snippetId } = request.params as { snippetId: string };
      const updateData = updateSnippetSchema.parse(request.body);

      // Verify snippet exists and user can edit it
      const existingSnippet = await db.query.snippets.findFirst({
        where: and(
          eq(snippets.id, snippetId),
          eq(snippets.tenantId, request.user!.tenantId)
        ),
      });

      if (!existingSnippet) {
        return reply.code(404).send({ error: 'Snippet not found' });
      }

      // Only creator or admins can edit snippets
      if (existingSnippet.createdBy !== request.user!.id && request.user!.role !== 'admin') {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      const [updatedSnippet] = await db.update(snippets)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(snippets.id, snippetId))
        .returning();

      // Log snippet update
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'snippet_updated',
        resourceType: 'snippet',
        resourceId: snippetId,
        ipAddress: request.ip,
        metadata: { fields: Object.keys(updateData) },
      });

      reply.send(updatedSnippet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Use snippet (increment usage count)
  fastify.post('/:snippetId/use', async (request, reply) => {
    try {
      const { snippetId } = request.params as { snippetId: string };

      const snippet = await db.query.snippets.findFirst({
        where: and(
          eq(snippets.id, snippetId),
          eq(snippets.tenantId, request.user!.tenantId),
          eq(snippets.isActive, true)
        ),
      });

      if (!snippet) {
        return reply.code(404).send({ error: 'Snippet not found' });
      }

      await db.update(snippets)
        .set({
          usageCount: (snippet.usageCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(snippets.id, snippetId));

      reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete snippet
  fastify.delete('/:snippetId', async (request, reply) => {
    try {
      const { snippetId } = request.params as { snippetId: string };

      // Verify snippet exists and user can delete it
      const existingSnippet = await db.query.snippets.findFirst({
        where: and(
          eq(snippets.id, snippetId),
          eq(snippets.tenantId, request.user!.tenantId)
        ),
      });

      if (!existingSnippet) {
        return reply.code(404).send({ error: 'Snippet not found' });
      }

      // Only creator or admins can delete snippets
      if (existingSnippet.createdBy !== request.user!.id && request.user!.role !== 'admin') {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      // Soft delete by setting isActive to false
      await db.update(snippets)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(snippets.id, snippetId));

      // Log snippet deletion
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'snippet_deleted',
        resourceType: 'snippet',
        resourceId: snippetId,
        ipAddress: request.ip,
      });

      reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
};