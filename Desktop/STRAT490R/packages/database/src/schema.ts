import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  domain: text('domain'),
  settings: text('settings'), // JSON string
  dataRegion: text('data_region').default('us-east'),
  retentionDays: integer('retention_days').default(90),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  role: text('role').default('agent'), // agent, manager, admin, auditor
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  agentId: text('agent_id').notNull().references(() => users.id),
  customerId: text('customer_id'),
  customerName: text('customer_name'),
  status: text('status').default('recording'), // recording, processing, completed, failed
  sources: text('sources'), // JSON string
  consentFlags: text('consent_flags'), // JSON string
  mediaUris: text('media_uris'), // JSON string
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  endedAt: text('ended_at'),
  duration: integer('duration'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  timestamp: text('timestamp').notNull(),
  type: text('type').notNull(), // asr_transcript, ui_click, etc.
  payload: text('payload'), // JSON string
  speakerTag: text('speaker_tag'),
  confidence: integer('confidence'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  problem: text('problem'),
  actions: text('actions'), // JSON string
  result: text('result'),
  nextSteps: text('next_steps'), // JSON string
  tags: text('tags'), // JSON string
  timeline: text('timeline'), // JSON string
  redactions: text('redactions'), // JSON string
  editorChanges: text('editor_changes'), // JSON string
  isCustomerFacing: integer('is_customer_facing', { mode: 'boolean' }).default(false),
  templateId: text('template_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const integrationMappings = sqliteTable('integration_mappings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  target: text('target').notNull(),
  fieldMap: text('field_map'), // JSON string
  authConfig: text('auth_config'), // JSON string
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reportsExports = sqliteTable('exports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  reportId: text('report_id').notNull().references(() => reports.id),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').notNull().references(() => users.id),
  target: text('target').notNull(),
  format: text('format').notNull(),
  status: text('status').default('pending'), // pending, processing, completed, failed
  externalId: text('external_id'),
  deepLink: text('deep_link'),
  errorMessage: text('error_message'),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const snippets = sqliteTable('snippets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category'),
  tags: text('tags'), // JSON string
  usageCount: integer('usage_count').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  sessions: many(sessions),
  reports: many(reports),
  integrationMappings: many(integrationMappings),
  exports: many(reportsExports),
  auditLogs: many(auditLogs),
  snippets: many(snippets),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  sessions: many(sessions),
  exports: many(reportsExports),
  snippetsCreated: many(snippets),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sessions.tenantId],
    references: [tenants.id],
  }),
  agent: one(users, {
    fields: [sessions.agentId],
    references: [users.id],
  }),
  events: many(events),
  reports: many(reports),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  session: one(sessions, {
    fields: [events.sessionId],
    references: [sessions.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  session: one(sessions, {
    fields: [reports.sessionId],
    references: [sessions.id],
  }),
  tenant: one(tenants, {
    fields: [reports.tenantId],
    references: [tenants.id],
  }),
  exports: many(reportsExports),
}));

export const integrationMappingsRelations = relations(integrationMappings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [integrationMappings.tenantId],
    references: [tenants.id],
  }),
}));

export const exportsRelations = relations(reportsExports, ({ one }) => ({
  report: one(reports, {
    fields: [reportsExports.reportId],
    references: [reports.id],
  }),
  tenant: one(tenants, {
    fields: [reportsExports.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [reportsExports.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const snippetsRelations = relations(snippets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [snippets.tenantId],
    references: [tenants.id],
  }),
  createdByUser: one(users, {
    fields: [snippets.createdBy],
    references: [users.id],
  }),
}));