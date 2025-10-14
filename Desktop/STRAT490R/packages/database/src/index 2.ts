import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/reportify';

export const sql = postgres(connectionString);
export const db = drizzle(sql, { schema });

export * from './schema';
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';