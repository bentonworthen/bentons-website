# Reportify Development Guide

## Architecture Overview

Reportify is built as a monorepo with the following components:

### Applications
- **`apps/api`** - Main FastifyJS backend API
- **`apps/web`** - Next.js web dashboard
- **`apps/desktop`** - Electron desktop capture client

### Packages
- **`packages/database`** - Drizzle ORM schema and database utilities
- **`packages/asr-service`** - Automatic Speech Recognition microservice

## Development Setup

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis (optional, for production features)
- Docker & Docker Compose (for containerized development)

### Quick Start

1. **Clone and install dependencies:**
```bash
git clone <repo-url>
cd reportify
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start database:**
```bash
docker-compose up postgres redis -d
```

4. **Run database migrations:**
```bash
npm run db:generate
npm run db:migrate
```

5. **Start all services:**
```bash
npm run dev
```

This will start:
- API server on http://localhost:3001
- Web dashboard on http://localhost:3000
- ASR service on http://localhost:3002

### Desktop Application

To run the Electron desktop client:

```bash
npm run desktop:dev
```

## Service Architecture

### API Service (`apps/api`)
- **Port**: 3001
- **Tech**: Fastify, TypeScript, Drizzle ORM
- **Features**: Authentication, session management, report generation, exports

### Web Dashboard (`apps/web`)
- **Port**: 3000
- **Tech**: Next.js 14, React, Tailwind CSS
- **Features**: Report viewing/editing, analytics, user management

### ASR Service (`packages/asr-service`)
- **Port**: 3002
- **Tech**: Fastify, WebSockets, OpenAI Whisper
- **Features**: Real-time transcription, content detection, batch processing

### Desktop Client (`apps/desktop`)
- **Tech**: Electron, TypeScript
- **Features**: Screen capture, audio recording, real-time event tracking

## Database Schema

The database uses PostgreSQL with Drizzle ORM. Key entities:

- **Tenants** - Multi-tenant organization isolation
- **Users** - Agent/manager/admin accounts with RBAC
- **Sessions** - Recording sessions with metadata
- **Events** - Timestamped events (ASR, UI interactions, etc.)
- **Reports** - Generated PAR-N structured documentation
- **Exports** - Integration exports to ITSM systems
- **Audit Logs** - Compliance and security tracking

## Development Commands

```bash
# Start all services in development mode
npm run dev

# Start individual services
npm run api:dev    # API server only
npm run web:dev    # Web dashboard only
npm run desktop:dev # Desktop client only

# Database operations
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations to database
npm run db:studio    # Open Drizzle Studio for database browsing

# Building and testing
npm run build       # Build all packages
npm run typecheck   # Type checking across all packages
npm run lint        # Lint all packages
npm run test        # Run tests

# Production builds
npm run dist        # Build everything for production
```

## Environment Variables

Key environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `OPENAI_API_KEY` - For Whisper transcription (optional)
- `SERVICENOW_*` - ServiceNow integration credentials
- `JIRA_*` - Jira integration credentials
- `ZENDESK_*` - Zendesk integration credentials

## Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test --workspace=@reportify/api
```

### Test Data
The development environment includes sample data for testing:

**Demo Users:**
- `admin@reportify.com` / `password` (Admin)
- `manager@reportify.com` / `password` (Manager)
- `agent@reportify.com` / `password` (Agent)

## Docker Development

For a fully containerized development environment:

```bash
# Start all services with Docker
docker-compose up

# Start specific services
docker-compose up postgres redis
docker-compose up api web

# View logs
docker-compose logs -f api
```

## Production Deployment

### Docker Production Build
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment
1. Build all packages: `npm run build`
2. Set production environment variables
3. Run database migrations: `npm run db:migrate`
4. Start services with PM2 or similar process manager

## Key Features Implementation

### Session Recording
1. Desktop client captures screen + audio
2. Events streamed to API via WebSocket
3. Audio chunks sent to ASR service for real-time transcription
4. UI events and OCR results stored as timestamped events

### Report Generation
1. Session ends, triggers report composition
2. AI analyzes events to generate PAR-N structure:
   - **Problem**: Extracted from early transcripts
   - **Actions**: Generated from UI events and procedures
   - **Result**: Determined from resolution transcripts
   - **Next Steps**: AI-suggested follow-ups
3. Report stored and available for editing

### Export Integration
1. Reports can be exported to PDF/DOCX/Markdown
2. Integration with ServiceNow, Jira, Zendesk via OAuth2
3. Configurable field mappings per tenant
4. Retry logic and failure handling

### Analytics & Compliance
1. Real-time analytics dashboard for managers
2. Comprehensive audit logging for compliance
3. RBAC with tenant isolation
4. PII detection and redaction tools

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists and migrations are applied

**ASR Service Not Working:**
- Check OPENAI_API_KEY is set (optional)
- Verify ASR service is running on port 3002
- Check audio format compatibility

**Desktop Client Issues:**
- Ensure screen recording permissions are granted
- Check API endpoint configuration
- Verify WebSocket connections

**Build Failures:**
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check TypeScript errors: `npm run typecheck`
- Verify all workspace dependencies are installed

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Performance Monitoring

The application includes built-in performance monitoring:
- API response times tracked
- Database query performance logged
- ASR processing latency measured
- Memory usage monitoring in desktop client

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation for API changes
4. Use conventional commit messages
5. Ensure all TypeScript checks pass

## Security Considerations

- All API endpoints require authentication
- RBAC enforced at database level
- Audit logs for all user actions
- PII detection and redaction
- Encrypted storage for sensitive data
- Rate limiting on API endpoints
- Input validation and sanitization