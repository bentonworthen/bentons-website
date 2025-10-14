// Mock database for development without SQLite dependencies
interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Session {
  id: string;
  tenantId: string;
  agentId: string;
  customerId?: string;
  customerName?: string;
  status: string;
  sources?: any;
  consentFlags?: any;
  mediaUris?: any;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

interface Report {
  id: string;
  sessionId: string;
  tenantId: string;
  problem?: string;
  actions?: any;
  result?: string;
  nextSteps?: any;
  tags?: any;
  timeline?: any;
  redactions?: any;
  editorChanges?: any;
  isCustomerFacing: boolean;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  sessionId: string;
  timestamp: string;
  type: string;
  payload?: any;
  speakerTag?: string;
  confidence?: number;
  createdAt: string;
}

interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
}

class MockDatabase {
  private users: User[] = [];
  private sessions: Session[] = [];
  private reports: Report[] = [];
  private events: Event[] = [];
  private auditLogs: AuditLog[] = [];

  constructor() {
    this.seedData();
  }

  private seedData() {
    const now = new Date().toISOString();
    const tenantId = 'demo-tenant-1';

    // Create demo users
    this.users = [
      {
        id: 'user-1',
        tenantId,
        email: 'admin@reportify.com',
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-2',
        tenantId,
        email: 'agent@reportify.com',
        name: 'Agent Smith',
        role: 'agent',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-3',
        tenantId,
        email: 'manager@reportify.com',
        name: 'Manager Johnson',
        role: 'manager',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Create demo sessions
    this.sessions = [
      {
        id: 'session-1',
        tenantId,
        agentId: 'user-2',
        customerId: 'customer-1',
        customerName: 'John Doe',
        status: 'completed',
        duration: 1200, // 20 minutes
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        endedAt: new Date(Date.now() - 2400000).toISOString(),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'session-2',
        tenantId,
        agentId: 'user-2',
        customerId: 'customer-2',
        customerName: 'Jane Smith',
        status: 'completed',
        duration: 900, // 15 minutes
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        endedAt: new Date(Date.now() - 6300000).toISOString(),
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Create demo reports
    this.reports = [
      {
        id: 'report-1',
        sessionId: 'session-1',
        tenantId,
        problem: "Customer's laptop would not connect to Wi-Fi network (SSID: Campus-Secure).",
        actions: [
          { step: 1, description: "Verified network adapter was enabled in Device Manager", timestamp: "2025-09-15T10:15:00Z" },
          { step: 2, description: "Forgot and rejoined the wireless network", timestamp: "2025-09-15T10:18:00Z" },
          { step: 3, description: "Updated Intel AX211 wireless driver to latest version", timestamp: "2025-09-15T10:25:00Z" },
          { step: 4, description: "Reset network stack using netsh commands", timestamp: "2025-09-15T10:30:00Z" },
          { step: 5, description: "Validated DHCP lease and internet connectivity", timestamp: "2025-09-15T10:35:00Z" }
        ],
        result: "Device successfully connected to Campus-Secure network. Ping to gateway shows <5ms latency. Internet browsing confirmed working.",
        nextSteps: [
          { description: "Monitor connectivity for 24 hours", owner: "T1 Queue", dueDate: "2025-09-16", priority: "low" },
          { description: "If issue recurs, replace network adapter", owner: "T2 Hardware", priority: "medium" }
        ],
        tags: ["network", "wifi", "driver-update", "resolved"],
        isCustomerFacing: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'report-2',
        sessionId: 'session-2',
        tenantId,
        problem: "User unable to access Outlook email, receiving authentication errors.",
        actions: [
          { step: 1, description: "Verified user credentials in Azure AD", timestamp: "2025-09-15T09:00:00Z" },
          { step: 2, description: "Cleared Outlook credential cache", timestamp: "2025-09-15T09:05:00Z" },
          { step: 3, description: "Re-configured mail profile with OAuth2", timestamp: "2025-09-15T09:10:00Z" },
          { step: 4, description: "Tested send/receive functionality", timestamp: "2025-09-15T09:15:00Z" }
        ],
        result: "Email account successfully configured. User can send and receive emails without authentication errors.",
        nextSteps: [
          { description: "Follow up in 48 hours to ensure continued functionality", owner: "T1 Queue", dueDate: "2025-09-17", priority: "low" }
        ],
        tags: ["email", "outlook", "authentication", "resolved"],
        isCustomerFacing: false,
        createdAt: now,
        updatedAt: now,
      }
    ];
  }

  // User methods
  findUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email === email);
  }

  findUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  findUsersByTenant(tenantId: string): User[] {
    return this.users.filter(u => u.tenantId === tenantId);
  }

  // Session methods
  createSession(sessionData: Partial<Session>): Session {
    const session: Session = {
      id: `session-${Date.now()}`,
      tenantId: sessionData.tenantId!,
      agentId: sessionData.agentId!,
      customerId: sessionData.customerId,
      customerName: sessionData.customerName,
      status: sessionData.status || 'recording',
      sources: sessionData.sources,
      consentFlags: sessionData.consentFlags,
      mediaUris: sessionData.mediaUris,
      startedAt: sessionData.startedAt || new Date().toISOString(),
      endedAt: sessionData.endedAt,
      duration: sessionData.duration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.sessions.push(session);
    return session;
  }

  findSessionsByTenant(tenantId: string): Session[] {
    return this.sessions.filter(s => s.tenantId === tenantId);
  }

  findSessionById(id: string): Session | undefined {
    return this.sessions.find(s => s.id === id);
  }

  updateSession(id: string, updates: Partial<Session>): Session | undefined {
    const sessionIndex = this.sessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) return undefined;

    this.sessions[sessionIndex] = {
      ...this.sessions[sessionIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.sessions[sessionIndex];
  }

  // Report methods
  createReport(reportData: Partial<Report>): Report {
    const report: Report = {
      id: `report-${Date.now()}`,
      sessionId: reportData.sessionId!,
      tenantId: reportData.tenantId!,
      problem: reportData.problem,
      actions: reportData.actions,
      result: reportData.result,
      nextSteps: reportData.nextSteps,
      tags: reportData.tags,
      timeline: reportData.timeline,
      redactions: reportData.redactions,
      editorChanges: reportData.editorChanges,
      isCustomerFacing: reportData.isCustomerFacing || false,
      templateId: reportData.templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.reports.push(report);
    return report;
  }

  findReportsByTenant(tenantId: string): Report[] {
    return this.reports.filter(r => r.tenantId === tenantId);
  }

  findReportById(id: string): Report | undefined {
    return this.reports.find(r => r.id === id);
  }

  findReportBySessionId(sessionId: string): Report | undefined {
    return this.reports.find(r => r.sessionId === sessionId);
  }

  updateReport(id: string, updates: Partial<Report>): Report | undefined {
    const reportIndex = this.reports.findIndex(r => r.id === id);
    if (reportIndex === -1) return undefined;

    this.reports[reportIndex] = {
      ...this.reports[reportIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.reports[reportIndex];
  }

  // Event methods
  addEvent(eventData: Partial<Event>): Event {
    const event: Event = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId: eventData.sessionId!,
      timestamp: eventData.timestamp!,
      type: eventData.type!,
      payload: eventData.payload,
      speakerTag: eventData.speakerTag,
      confidence: eventData.confidence,
      createdAt: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  findEventsBySession(sessionId: string): Event[] {
    return this.events.filter(e => e.sessionId === sessionId);
  }

  // Audit log methods
  addAuditLog(logData: Partial<AuditLog>): AuditLog {
    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      tenantId: logData.tenantId!,
      userId: logData.userId,
      action: logData.action!,
      resourceType: logData.resourceType,
      resourceId: logData.resourceId,
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent,
      metadata: logData.metadata,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.push(log);
    return log;
  }

  findAuditLogsByTenant(tenantId: string, limit: number = 100): AuditLog[] {
    return this.auditLogs
      .filter(log => log.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

export const mockDb = new MockDatabase();
export * from './schema';