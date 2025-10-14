import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { db } from '@reportify/database';
import logger from './utils/logger';
import { authRoutes } from './routes/auth';
import { sessionRoutes } from './routes/sessions';
import { reportRoutes } from './routes/reports';
import { userRoutes } from './routes/users';
import { exportRoutes } from './routes/exports';
import { snippetRoutes } from './routes/snippets';
import { auditRoutes } from './routes/audit';
import { analyticsRoutes } from './routes/analytics';
import { authenticate } from './middleware/auth';

const fastify = Fastify({
  logger: logger,
});

async function start() {
  try {
    await fastify.register(cors, {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://app.reportify.com', 'https://dashboard.reportify.com']
        : true,
      credentials: true,
    });

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'supersecret',
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    });

    await fastify.register(websocket);

    // Add authenticate decorator
    fastify.decorate('authenticate', authenticate);

    // Health check
    fastify.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(sessionRoutes, { prefix: '/api/sessions' });
    await fastify.register(reportRoutes, { prefix: '/api/reports' });
    await fastify.register(userRoutes, { prefix: '/api/users' });
    await fastify.register(exportRoutes, { prefix: '/api/exports' });
    await fastify.register(snippetRoutes, { prefix: '/api/snippets' });
    await fastify.register(auditRoutes, { prefix: '/api/audit' });
    await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });

    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    logger.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();