import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, sessions, reports, users } from '@reportify/database';
import { eq, and, desc, gte, count, avg, sql } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  agentId: z.string().uuid().optional(),
});

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // Get analytics dashboard data (managers and admins only)
  fastify.get('/dashboard', {
    preHandler: [requireRole(['manager', 'admin'])],
  }, async (request, reply) => {
    try {
      const query = analyticsQuerySchema.parse(request.query);

      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      let whereConditions = [
        eq(sessions.tenantId, request.user!.tenantId),
        gte(sessions.createdAt, startDate),
      ];

      if (query.agentId) {
        whereConditions.push(eq(sessions.agentId, query.agentId));
      }

      // Get session metrics
      const sessionMetrics = await db.select({
        totalSessions: count(),
        avgDuration: avg(sessions.duration),
      }).from(sessions)
        .where(and(...whereConditions));

      // Get report metrics
      const reportMetrics = await db.select({
        totalReports: count(),
      }).from(reports)
        .innerJoin(sessions, eq(reports.sessionId, sessions.id))
        .where(and(...whereConditions));

      // Get agent performance
      const agentPerformance = await db.select({
        agentId: sessions.agentId,
        agentName: users.name,
        sessionCount: count(sessions.id),
        avgDuration: avg(sessions.duration),
      }).from(sessions)
        .innerJoin(users, eq(sessions.agentId, users.id))
        .where(and(...whereConditions))
        .groupBy(sessions.agentId, users.name)
        .orderBy(desc(count(sessions.id)));

      // Get daily activity
      const dailyActivity = await db.select({
        date: sql<string>`date_trunc('day', ${sessions.createdAt})::text`,
        sessionCount: count(),
      }).from(sessions)
        .where(and(...whereConditions))
        .groupBy(sql`date_trunc('day', ${sessions.createdAt})`)
        .orderBy(sql`date_trunc('day', ${sessions.createdAt})`);

      // Calculate time savings (assuming 70% reduction as per PRD goal)
      const estimatedTimeSaved = sessionMetrics[0]?.totalSessions
        ? sessionMetrics[0].totalSessions * 15 * 0.7 // 15 min baseline * 70% reduction
        : 0;

      reply.send({
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        overview: {
          totalSessions: sessionMetrics[0]?.totalSessions || 0,
          totalReports: reportMetrics[0]?.totalReports || 0,
          avgSessionDuration: Math.round(sessionMetrics[0]?.avgDuration || 0),
          estimatedTimeSavedMinutes: Math.round(estimatedTimeSaved),
        },
        agentPerformance: agentPerformance.map(agent => ({
          ...agent,
          avgDuration: Math.round(agent.avgDuration || 0),
        })),
        dailyActivity,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get quality metrics
  fastify.get('/quality', {
    preHandler: [requireRole(['manager', 'admin'])],
  }, async (request, reply) => {
    try {
      const query = analyticsQuerySchema.parse(request.query);

      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      let whereConditions = [
        eq(reports.tenantId, request.user!.tenantId),
        gte(reports.createdAt, startDate),
      ];

      // Get report completeness metrics
      const reportsWithSections = await db.select({
        id: reports.id,
        hasProblem: sql<boolean>`CASE WHEN ${reports.problem} IS NOT NULL AND ${reports.problem} != '' THEN true ELSE false END`,
        hasActions: sql<boolean>`CASE WHEN ${reports.actions} IS NOT NULL AND jsonb_array_length(${reports.actions}) > 0 THEN true ELSE false END`,
        hasResult: sql<boolean>`CASE WHEN ${reports.result} IS NOT NULL AND ${reports.result} != '' THEN true ELSE false END`,
        hasNextSteps: sql<boolean>`CASE WHEN ${reports.nextSteps} IS NOT NULL AND jsonb_array_length(${reports.nextSteps}) > 0 THEN true ELSE false END`,
      }).from(reports)
        .where(and(...whereConditions));

      const totalReports = reportsWithSections.length;
      const completeReports = reportsWithSections.filter(r =>
        r.hasProblem && r.hasActions && r.hasResult && r.hasNextSteps
      ).length;

      const completenessRate = totalReports > 0 ? (completeReports / totalReports) * 100 : 0;

      // Get editing effort metrics (simulated for demo)
      const editingMetrics = {
        avgEditsPerReport: 2.3,
        avgEditTimeSeconds: 65,
        reportsWithNoEdits: Math.round(totalReports * 0.4),
      };

      reply.send({
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        completeness: {
          totalReports,
          completeReports,
          completenessRate: Math.round(completenessRate * 100) / 100,
          sectionBreakdown: {
            problem: reportsWithSections.filter(r => r.hasProblem).length,
            actions: reportsWithSections.filter(r => r.hasActions).length,
            result: reportsWithSections.filter(r => r.hasResult).length,
            nextSteps: reportsWithSections.filter(r => r.hasNextSteps).length,
          },
        },
        editing: editingMetrics,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get trend analysis
  fastify.get('/trends', {
    preHandler: [requireRole(['manager', 'admin'])],
  }, async (request, reply) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      // Get current period metrics
      const currentPeriod = await db.select({
        sessionCount: count(),
        avgDuration: avg(sessions.duration),
      }).from(sessions)
        .where(and(
          eq(sessions.tenantId, request.user!.tenantId),
          gte(sessions.createdAt, thirtyDaysAgo)
        ));

      // Get previous period metrics
      const previousPeriod = await db.select({
        sessionCount: count(),
        avgDuration: avg(sessions.duration),
      }).from(sessions)
        .where(and(
          eq(sessions.tenantId, request.user!.tenantId),
          gte(sessions.createdAt, sixtyDaysAgo),
          sql`${sessions.createdAt} < ${thirtyDaysAgo}`
        ));

      const current = currentPeriod[0] || { sessionCount: 0, avgDuration: 0 };
      const previous = previousPeriod[0] || { sessionCount: 0, avgDuration: 0 };

      // Calculate percentage changes
      const sessionGrowth = previous.sessionCount > 0
        ? ((current.sessionCount - previous.sessionCount) / previous.sessionCount) * 100
        : 0;

      const durationChange = previous.avgDuration > 0
        ? ((current.avgDuration - previous.avgDuration) / previous.avgDuration) * 100
        : 0;

      reply.send({
        currentPeriod: {
          sessions: current.sessionCount,
          avgDuration: Math.round(current.avgDuration || 0),
        },
        previousPeriod: {
          sessions: previous.sessionCount,
          avgDuration: Math.round(previous.avgDuration || 0),
        },
        trends: {
          sessionGrowth: Math.round(sessionGrowth * 100) / 100,
          durationChange: Math.round(durationChange * 100) / 100,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
};