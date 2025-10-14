import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, auditLogs } from '@reportify/database';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';

const auditQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // Get audit logs (admins and auditors only)
  fastify.get('/', {
    preHandler: [requireRole(['admin', 'auditor'])],
  }, async (request, reply) => {
    try {
      const query = auditQuerySchema.parse(request.query);

      let whereConditions = [eq(auditLogs.tenantId, request.user!.tenantId)];

      if (query.startDate) {
        whereConditions.push(gte(auditLogs.createdAt, new Date(query.startDate)));
      }

      if (query.endDate) {
        whereConditions.push(lte(auditLogs.createdAt, new Date(query.endDate)));
      }

      if (query.userId) {
        whereConditions.push(eq(auditLogs.userId, query.userId));
      }

      if (query.action) {
        whereConditions.push(eq(auditLogs.action, query.action));
      }

      if (query.resourceType) {
        whereConditions.push(eq(auditLogs.resourceType, query.resourceType));
      }

      const [logs, totalCount] = await Promise.all([
        db.query.auditLogs.findMany({
          where: and(...whereConditions),
          orderBy: [desc(auditLogs.createdAt)],
          limit: query.limit,
          offset: query.offset,
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        db.select({ count: db.selectDistinct() }).from(auditLogs).where(and(...whereConditions))
      ]);

      reply.send({
        logs,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total: totalCount.length,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get audit log summary/statistics
  fastify.get('/summary', {
    preHandler: [requireRole(['admin', 'auditor'])],
  }, async (request, reply) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get activity summary for the last 30 days
      const recentLogs = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.tenantId, request.user!.tenantId),
          gte(auditLogs.createdAt, thirtyDaysAgo)
        ),
      });

      // Aggregate statistics
      const actionCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};
      const dailyActivity: Record<string, number> = {};

      recentLogs.forEach(log => {
        // Count by action
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

        // Count by user
        if (log.userId) {
          userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
        }

        // Count by day
        const day = log.createdAt.toISOString().split('T')[0];
        dailyActivity[day] = (dailyActivity[day] || 0) + 1;
      });

      reply.send({
        totalEvents: recentLogs.length,
        actionCounts,
        userCounts,
        dailyActivity,
        period: {
          start: thirtyDaysAgo.toISOString(),
          end: new Date().toISOString(),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Export audit logs
  fastify.get('/export', {
    preHandler: [requireRole(['admin', 'auditor'])],
  }, async (request, reply) => {
    try {
      const query = auditQuerySchema.parse(request.query);

      let whereConditions = [eq(auditLogs.tenantId, request.user!.tenantId)];

      if (query.startDate) {
        whereConditions.push(gte(auditLogs.createdAt, new Date(query.startDate)));
      }

      if (query.endDate) {
        whereConditions.push(lte(auditLogs.createdAt, new Date(query.endDate)));
      }

      const logs = await db.query.auditLogs.findMany({
        where: and(...whereConditions),
        orderBy: [desc(auditLogs.createdAt)],
        limit: 10000, // Cap exports at 10k records
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Convert to CSV format
      const csvHeaders = [
        'timestamp',
        'user_id',
        'user_name',
        'user_email',
        'action',
        'resource_type',
        'resource_id',
        'ip_address',
        'user_agent',
        'metadata'
      ];

      const csvRows = logs.map(log => [
        log.createdAt.toISOString(),
        log.userId || '',
        log.user?.name || '',
        log.user?.email || '',
        log.action,
        log.resourceType || '',
        log.resourceId || '',
        log.ipAddress || '',
        log.userAgent || '',
        JSON.stringify(log.metadata || {})
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`)
        .send(csvContent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
};