import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['agent', 'manager', 'admin', 'auditor']);
export const sessionStatusEnum = pgEnum('session_status', ['recording', 'processing', 'completed', 'failed']);
export const eventTypeEnum = pgEnum('event_type', ['asr_transcript', 'asr_word', 'ui_click', 'ui_input_meta', 'window_focus', 'app_launch', 'net_change', 'ocr_text', 'user_note', 'privacy_pause', 'privacy_resume']);
export const exportStatusEnum = pgEnum('export_status', ['pending', 'processing', 'completed', 'failed']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).unique(),
  settings: jsonb('settings'),
  dataRegion: varchar('data_region', { length: 50 }).default('us-east'),
  retentionDays: integer('retention_days').default(90),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('agent'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  agentId: uuid('agent_id').references(() => users.id).notNull(),
  customerId: varchar('customer_id', { length: 255 }),
  customerName: varchar('customer_name', { length: 255 }),
  status: sessionStatusEnum('status').default('recording'),
  sources: jsonb('sources'),
  consentFlags: jsonb('consent_flags'),
  mediaUris: jsonb('media_uris'),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  type: eventTypeEnum('type').notNull(),
  payload: jsonb('payload'),
  speakerTag: varchar('speaker_tag', { length: 50 }),
  confidence: integer('confidence'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  problem: text('problem'),
  actions: jsonb('actions'),
  result: text('result'),
  nextSteps: jsonb('next_steps'),
  tags: jsonb('tags'),
  timeline: jsonb('timeline'),
  redactions: jsonb('redactions'),
  editorChanges: jsonb('editor_changes'),
  isCustomerFacing: boolean('is_customer_facing').default(false),
  templateId: varchar('template_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const integrationMappings = pgTable('integration_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  target: varchar('target', { length: 100 }).notNull(),
  fieldMap: jsonb('field_map'),
  authConfig: jsonb('auth_config'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const exports = pgTable('exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').references(() => reports.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  target: varchar('target', { length: 100 }).notNull(),
  format: varchar('format', { length: 50 }).notNull(),
  status: exportStatusEnum('status').default('pending'),
  externalId: varchar('external_id', { length: 255 }),
  deepLink: text('deep_link'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }),
  resourceId: varchar('resource_id', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const snippets = pgTable('snippets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),
  tags: jsonb('tags'),
  usageCount: integer('usage_count').default(0),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  sessions: many(sessions),
  reports: many(reports),
  integrationMappings: many(integrationMappings),
  exports: many(exports),
  auditLogs: many(auditLogs),
  snippets: many(snippets),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  sessions: many(sessions),
  exports: many(exports),
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
  exports: many(exports),
}));

export const integrationMappingsRelations = relations(integrationMappings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [integrationMappings.tenantId],
    references: [tenants.id],
  }),
}));

export const exportsRelations = relations(exports, ({ one }) => ({
  report: one(reports, {
    fields: [exports.reportId],
    references: [reports.id],
  }),
  tenant: one(tenants, {
    fields: [exports.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [exports.userId],
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