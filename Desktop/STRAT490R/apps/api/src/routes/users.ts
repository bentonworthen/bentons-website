import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, users, auditLogs } from '@reportify/database';
import { eq, and } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['agent', 'manager', 'admin', 'auditor']).optional(),
  isActive: z.boolean().optional(),
});

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // Get users (managers and admins only)
  fastify.get('/', {
    preHandler: [requireRole(['manager', 'admin'])],
  }, async (request, reply) => {
    try {
      const userList = await db.query.users.findMany({
        where: eq(users.tenantId, request.user!.tenantId),
        columns: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      reply.send(userList);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specific user
  fastify.get('/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      // Users can view their own profile, managers/admins can view others
      if (request.user!.id !== userId && !['manager', 'admin'].includes(request.user!.role)) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      const user = await db.query.users.findFirst({
        where: and(
          eq(users.id, userId),
          eq(users.tenantId, request.user!.tenantId)
        ),
        columns: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      reply.send(user);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update user (admins only, or users updating themselves)
  fastify.patch('/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const updateData = updateUserSchema.parse(request.body);

      // Check permissions
      const isOwnProfile = request.user!.id === userId;
      const isAdmin = request.user!.role === 'admin';

      if (!isOwnProfile && !isAdmin) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      // Users can only update their own name, not role or active status
      if (isOwnProfile && !isAdmin) {
        if (updateData.role || updateData.isActive !== undefined) {
          return reply.code(403).send({ error: 'Cannot modify role or active status' });
        }
      }

      // Verify user exists and belongs to tenant
      const existingUser = await db.query.users.findFirst({
        where: and(
          eq(users.id, userId),
          eq(users.tenantId, request.user!.tenantId)
        ),
      });

      if (!existingUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const [updatedUser] = await db.update(users)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
        });

      // Log user update
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'user_updated',
        resourceType: 'user',
        resourceId: userId,
        ipAddress: request.ip,
        metadata: { fields: Object.keys(updateData) },
      });

      reply.send(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
};