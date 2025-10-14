import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { mockDb as db } from '../database/mock-db';
import { authenticate } from '../middleware/auth';
import { generatePARNReport } from '../services/reportComposer';

const updateReportSchema = z.object({
  problem: z.string().optional(),
  actions: z.array(z.object({
    step: z.number(),
    description: z.string(),
    timestamp: z.string().optional(),
    screenshot: z.string().optional(),
  })).optional(),
  result: z.string().optional(),
  nextSteps: z.array(z.object({
    description: z.string(),
    owner: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  })).optional(),
  tags: z.array(z.string()).optional(),
  redactions: z.array(z.object({
    type: z.enum(['blur', 'delete', 'mask']),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).optional(),
  })).optional(),
});

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // Generate report for session
  fastify.post('/:sessionId/generate', async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };

      // Verify session exists and belongs to tenant
      const session = await db.query.sessions.findFirst({
        where: and(
          eq(sessions.id, sessionId),
          eq(sessions.tenantId, request.user!.tenantId)
        ),
        with: {
          events: {
            orderBy: [sessions.createdAt],
          },
        },
      });

      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Check if report already exists
      const existingReport = await db.query.reports.findFirst({
        where: eq(reports.sessionId, sessionId),
      });

      if (existingReport) {
        return reply.send(existingReport);
      }

      // Generate PAR-N report using AI
      const reportData = await generatePARNReport(session);

      const [report] = await db.insert(reports).values({
        sessionId,
        tenantId: request.user!.tenantId,
        problem: reportData.problem,
        actions: reportData.actions,
        result: reportData.result,
        nextSteps: reportData.nextSteps,
        tags: reportData.tags,
        timeline: reportData.timeline,
      }).returning();

      // Update session status
      await db.update(sessions)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(sessions.id, sessionId));

      // Log report generation
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'report_generated',
        resourceType: 'report',
        resourceId: report.id,
        ipAddress: request.ip,
        metadata: { sessionId },
      });

      reply.send(report);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to generate report' });
    }
  });

  // Get reports
  fastify.get('/', async (request, reply) => {
    try {
      const reportList = db.findReportsByTenant(request.user!.tenantId);

      // Enrich with session and user data
      const enrichedReports = reportList.map(report => {
        const session = db.findSessionById(report.sessionId);
        const agent = session ? db.findUserById(session.agentId) : null;

        return {
          ...report,
          session: session ? {
            id: session.id,
            customerId: session.customerId,
            customerName: session.customerName,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            agent: agent ? {
              id: agent.id,
              name: agent.name,
              email: agent.email,
            } : null,
          } : null,
        };
      });

      reply.send(enrichedReports);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specific report
  fastify.get('/:reportId', async (request, reply) => {
    try {
      const { reportId } = request.params as { reportId: string };

      const report = db.findReportById(reportId);

      if (!report || report.tenantId !== request.user!.tenantId) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      // Enrich with session data
      const session = db.findSessionById(report.sessionId);
      const agent = session ? db.findUserById(session.agentId) : null;

      const enrichedReport = {
        ...report,
        session: session ? {
          ...session,
          agent: agent ? {
            id: agent.id,
            name: agent.name,
            email: agent.email,
          } : null,
        } : null,
      };

      // Log report access
      db.addAuditLog({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'report_viewed',
        resourceType: 'report',
        resourceId: reportId,
        ipAddress: request.ip,
      });

      reply.send(enrichedReport);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update report
  fastify.patch('/:reportId', async (request, reply) => {
    try {
      const { reportId } = request.params as { reportId: string };
      const updateData = updateReportSchema.parse(request.body);

      // Verify report exists and belongs to tenant
      const existingReport = await db.query.reports.findFirst({
        where: and(
          eq(reports.id, reportId),
          eq(reports.tenantId, request.user!.tenantId)
        ),
      });

      if (!existingReport) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      const [updatedReport] = await db.update(reports)
        .set({
          ...updateData,
          updatedAt: new Date(),
          editorChanges: {
            ...existingReport.editorChanges as any,
            lastEditedBy: request.user!.id,
            lastEditedAt: new Date().toISOString(),
            changes: [
              ...(existingReport.editorChanges as any)?.changes || [],
              {
                timestamp: new Date().toISOString(),
                userId: request.user!.id,
                fields: Object.keys(updateData),
              },
            ],
          },
        })
        .where(eq(reports.id, reportId))
        .returning();

      // Log report edit
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'report_edited',
        resourceType: 'report',
        resourceId: reportId,
        ipAddress: request.ip,
        metadata: { fields: Object.keys(updateData) },
      });

      reply.send(updatedReport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete report
  fastify.delete('/:reportId', async (request, reply) => {
    try {
      const { reportId } = request.params as { reportId: string };

      // Verify report exists and belongs to tenant
      const existingReport = await db.query.reports.findFirst({
        where: and(
          eq(reports.id, reportId),
          eq(reports.tenantId, request.user!.tenantId)
        ),
      });

      if (!existingReport) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      await db.delete(reports).where(eq(reports.id, reportId));

      // Log report deletion
      await db.insert(auditLogs).values({
        tenantId: request.user!.tenantId,
        userId: request.user!.id,
        action: 'report_deleted',
        resourceType: 'report',
        resourceId: reportId,
        ipAddress: request.ip,
      });

      reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
};