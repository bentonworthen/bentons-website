import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { mockDb as db } from '../database/mock-db';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantId: z.string().uuid(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const user = db.findUserByEmail(email);

      if (!user || !user.isActive) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // For demo purposes, accept "password" as the password for all users
      if (password !== 'password') {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const token = fastify.jwt.sign(
        { userId: user.id },
        { expiresIn: '24h' }
      );

      // Log the login
      db.addAuditLog({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'login',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
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

  fastify.post('/register', async (request, reply) => {
    try {
      const { email, password, name, tenantId } = registerSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return reply.code(409).send({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [newUser] = await db.insert(users).values({
        email,
        name,
        tenantId,
        role: 'agent',
      }).returning();

      const token = fastify.jwt.sign(
        { userId: newUser.id },
        { expiresIn: '24h' }
      );

      // Log the registration
      await db.insert(auditLogs).values({
        tenantId: newUser.tenantId,
        userId: newUser.id,
        action: 'register',
        resourceType: 'user',
        resourceId: newUser.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      reply.send({
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          tenantId: newUser.tenantId,
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

  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    reply.send({ user: request.user });
  });
};