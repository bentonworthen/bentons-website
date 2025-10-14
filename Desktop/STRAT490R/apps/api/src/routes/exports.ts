import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, exports, reports, auditLogs } from '@reportify/database';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';

const createExportSchema = z.object({
  reportId: z.string().uuid(),
  target: z.enum(['servicenow', 'jira', 'zendesk', 'pdf', 'docx', 'markdown']),
  format: z.enum(['pdf', 'docx', 'markdown', 'json']),
  template: z.string().optional(),
  fieldMapping: z.record(z.string()).optional(),
});

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // Create export
  fastify.post('/', async (request, reply) => {
    try {
      const data = createExportSchema.parse(request.body);

      // Verify report exists and belongs to tenant
      const report = await db.query.reports.findFirst({
        where: and(
          eq(reports.id, data.reportId),
          eq(reports.tenantId, request.user!.tenantId)
        ),
        with: {
          session: true,
        },
      });

      if (!report) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      const [exportRecord] = await db.insert(exports).values({
        reportId: data.reportId,
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        target: data.target,
        format: data.format,
        status: 'pending',
        metadata: {
          template: data.template,
          fieldMapping: data.fieldMapping,
        },
      }).returning();

      // In a real implementation, this would trigger an async job
      // For demo purposes, we'll simulate immediate processing
      setTimeout(async () => {
        try {
          const result = await processExport(exportRecord.id, report, data);

          await db.update(exports)
            .set({
              status: 'completed',
              externalId: result.externalId,
              deepLink: result.deepLink,
              updatedAt: new Date(),
            })
            .where(eq(exports.id, exportRecord.id));
        } catch (error) {
          await db.update(exports)
            .set({
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              updatedAt: new Date(),
            })
            .where(eq(exports.id, exportRecord.id));
        }
      }, 1000);

      // Log export creation
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'export_created',
        resourceType: 'export',
        resourceId: exportRecord.id,
        ipAddress: request.ip,
        metadata: { reportId: data.reportId, target: data.target },
      });

      reply.send(exportRecord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get exports
  fastify.get('/', async (request, reply) => {
    try {
      const exportList = await db.query.exports.findMany({
        where: eq(exports.tenantId, request.user!.tenantId),
        orderBy: [desc(exports.createdAt)],
        limit: 50,
        with: {
          report: {
            columns: {
              id: true,
              problem: true,
            },
            with: {
              session: {
                columns: {
                  customerId: true,
                  customerName: true,
                },
              },
            },
          },
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      reply.send(exportList);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specific export
  fastify.get('/:exportId', async (request, reply) => {
    try {
      const { exportId } = request.params as { exportId: string };

      const exportRecord = await db.query.exports.findFirst({
        where: and(
          eq(exports.id, exportId),
          eq(exports.tenantId, request.user!.tenantId)
        ),
        with: {
          report: {
            with: {
              session: true,
            },
          },
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!exportRecord) {
        return reply.code(404).send({ error: 'Export not found' });
      }

      reply.send(exportRecord);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Retry failed export
  fastify.post('/:exportId/retry', async (request, reply) => {
    try {
      const { exportId } = request.params as { exportId: string };

      const exportRecord = await db.query.exports.findFirst({
        where: and(
          eq(exports.id, exportId),
          eq(exports.tenantId, request.user!.tenantId)
        ),
        with: {
          report: {
            with: {
              session: true,
            },
          },
        },
      });

      if (!exportRecord) {
        return reply.code(404).send({ error: 'Export not found' });
      }

      if (exportRecord.status !== 'failed') {
        return reply.code(400).send({ error: 'Can only retry failed exports' });
      }

      // Reset status to pending
      await db.update(exports)
        .set({
          status: 'pending',
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(exports.id, exportId));

      // Trigger retry processing
      setTimeout(async () => {
        try {
          const result = await processExport(exportId, exportRecord.report, {
            reportId: exportRecord.reportId,
            target: exportRecord.target as any,
            format: exportRecord.format as any,
            template: exportRecord.metadata?.template,
            fieldMapping: exportRecord.metadata?.fieldMapping,
          });

          await db.update(exports)
            .set({
              status: 'completed',
              externalId: result.externalId,
              deepLink: result.deepLink,
              updatedAt: new Date(),
            })
            .where(eq(exports.id, exportId));
        } catch (error) {
          await db.update(exports)
            .set({
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              updatedAt: new Date(),
            })
            .where(eq(exports.id, exportId));
        }
      }, 1000);

      reply.send({ success: true, message: 'Export retry initiated' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
};

async function processExport(exportId: string, report: any, config: any) {
  // Simulate export processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  switch (config.target) {
    case 'servicenow':
      return {
        externalId: `INC${Math.random().toString().substr(2, 7)}`,
        deepLink: `https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=${exportId}`,
      };
    case 'jira':
      return {
        externalId: `HELP-${Math.floor(Math.random() * 1000)}`,
        deepLink: `https://company.atlassian.net/browse/HELP-${Math.floor(Math.random() * 1000)}`,
      };
    case 'zendesk':
      return {
        externalId: Math.floor(Math.random() * 100000).toString(),
        deepLink: `https://company.zendesk.com/agent/tickets/${Math.floor(Math.random() * 100000)}`,
      };
    default:
      return {
        externalId: `file_${exportId}.${config.format}`,
        deepLink: `https://storage.reportify.com/exports/${exportId}.${config.format}`,
      };
  }
}