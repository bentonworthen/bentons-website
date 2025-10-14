import { FastifyRequest, FastifyReply } from 'fastify';
import { mockDb as db } from '../database/mock-db';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'agent' | 'manager' | 'admin' | 'auditor';
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = await request.jwtVerify<{ userId: string }>();

    const user = db.findUserById(token.userId);

    if (!user || !user.isActive) {
      return reply.code(401).send({ error: 'Invalid or inactive user' });
    }

    request.user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role || 'agent',
    };
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };
}