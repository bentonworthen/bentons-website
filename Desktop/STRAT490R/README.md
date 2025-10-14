# Product Requirements Document (PRD)

## Document Control

* **Product**: Reportify — Automated IT & Customer Support Documentation
* **Version**: v0.9 (Draft)
* **Authors**: <owner PM>, <tech lead>, <design lead>
* **Last Updated**: 2025‑09‑15
* **Reviewers**: Security, Legal, Sales, Customer Success, Design

---

## 1) Product Summary (One‑liner)

Reportify observes support sessions (screen + audio), understands what happened, and auto‑produces an editable, structured record — **Problem → Actions → Result → Next Steps** — that syncs to your ITSM/CRM.

**Positioning**: Hands‑free, accurate documentation for IT help desks, MSPs, and technical CS teams who want consistent, audit‑ready service notes without slowing down the fix.

---

## 2) Goals & Non‑Goals

### Goals

1. **Reduce documentation time** by ≥ **70%** per ticket (baseline: manual notes).
2. **Improve consistency**: ≥ **95%** of reports include all 4 sections (PAR‑N) and required metadata.
3. **Accuracy**: ≥ **90%** step‑capture precision on supported apps/workflows in GA.
4. **Adoption**: ≥ **60%** weekly active among agents who installed the recorder.
5. **Integration**: One‑click export/sync to **ServiceNow, Jira, Zendesk** with field mapping.

### Non‑Goals (v1)

* Live remote‑control or remote‑assist features.
* Full RMM/EDR functionality.
* Replacing the ITSM; we **augment** it.

---

## 3) Target Users & Personas

* **IT Help Desk Agent (Tier 1)**: Solves common issues quickly; wants zero‑friction capture.
* **MSP Field/Remote Engineer (Tier 2/3)**: Complex troubleshooting; cares about audit trails and customer‑facing reports.
* **Technical CS Specialist**: Mixed chat/call + screen triage; needs clean summaries for handoffs.
* **Team Lead / Manager**: Wants uniform notes, searchable history, QA, coaching insights.
* **Security & Compliance Officer (Admin)**: Requires audit logs, data controls, lawful processing, and retention.

---

## 4) Success Metrics (KPIs)

* **Time to Document (TTD)**: median minutes/ticket ↓ 70%.
* **Report Completeness**: % reports with Problem, Actions, Result, Next Steps ≥ 95%.
* **Editing Effort**: median edits per report ≤ 3, median edit time ≤ 90s.
* **Export Reliability**: export failure rate ≤ 0.5% per 1,000 exports.
* **Transcription Latency**: p95 < 2s, **Report Compose Time**: p95 < 10s post‑session.
* **QA Score Uplift**: internal QA rubric +15% vs. control.

---

## 5) Scope (MoSCoW)

### Must‑Have (M)

* Desktop capture (macOS + Windows): full screen + app/window selection, pause/resume, hotkey.
* Bidirectional audio capture (agent + customer) with speaker diarization.
* Real‑time speech‑to‑text (<2s p95) with profanity & PII detection.
* Action recognition from UI events (clicks, forms, commands) on supported apps/browsers.
* Auto‑structuring into **Problem / Actions / Result / Next Steps** (+ timestamped timeline).
* Inline editor with tracked changes & redaction tools (blur/mask, delete segments).
* Exports: PDF, DOCX, Markdown; sync to ServiceNow/Jira/Zendesk (OAuth2 + field mapping).
* Role‑based access control (RBAC), SSO (SAML/OIDC), audit logs, retention policies.
* Encrypted storage (AES‑256 at rest, TLS 1.3 in transit); tenant isolation.

### Should‑Have (S)

* Browser extension capture (Chrome/Edge) for lightweight web‑only sessions.
* Glossary & macro suggestions (normalize terminology across a team).
* Snippet library (common resolutions) with auto‑insert.
* Analytics for managers (time saved, doc quality, frequent issues).

### Could‑Have (C)

* Auto‑ticket creation from a call/meeting calendar join.
* Customer‑facing sanitized summary link.
* Multilingual transcription & translation.

### Won't‑Have (W) — for v1

* Mobile screen capture, Linux desktop recorder.
* Custom LLM per tenant (future Enterprise+).

---

## 6) User Flows (Happy Paths)

### A) Agent: Capture → Review → Export

1. Agent clicks **Start Capture** (or uses hotkey).
2. Selects source(s): screen(s), app windows; mic/speaker devices.
3. Troubleshoots as usual. Reportify streams ASR + UI events; shows live **timeline**.
4. Stops capture. System composes the report (≤10s).
5. Agent reviews in editor, accepts suggestions/redactions.
6. Clicks **Export** → selects template + target (e.g., ServiceNow incident).
7. Confirmation with deep link to synced record.

### B) Manager: QA & Analytics

1. Opens **Dashboard** → sees documentation coverage, time saved, top issues.
2. Reviews random samples; leaves inline coaching comments.
3. Exports CSV/JSON for BI.

### C) Security Admin: Configure & Govern

1. Enforces SSO and RBAC roles; sets data residency + retention (e.g., 30/90/365 days).
2. Defines redaction rules (e.g., card numbers, SSNs, tokens) and banned capture zones/apps.
3. Audits access & export logs; pulls DSR (GDPR) or legal hold if needed.

---

## 7) Functional Requirements & Acceptance Criteria

### 7.1 Session Capture

**FR‑C1** Desktop app supports full screen, specific app/window, and multi‑monitor capture.
**AC**: User can select at least one window/app; indicator watermark shows when recording; hotkey pauses within 100ms.

**FR‑C2** Audio capture supports agent mic + system audio; diarization tags speakers as Agent/Customer.
**AC**: In a 10‑minute call with overlap, diarization accuracy ≥ 85%.

**FR‑C3** Event monitoring (opt‑in) gathers clicks, keystrokes (non‑content by default), window titles, URLs, and system logs where allowed.
**AC**: Keystroke content is never stored unless explicitly enabled; secure banner explains scope.

**FR‑C4** Privacy controls: pause recording, exclude apps/domains, blocklist windows, blur sensitive regions.
**AC**: Blocklisted windows never appear in stored media or transcripts.

### 7.2 AI Analysis & Understanding

**FR‑A1** Real‑time ASR with profanity/PII detection and word timestamps.
**AC**: p95 latency < 2s; WER ≤ 12% on supported accents.

**FR‑A2** Action Recognition from UI events + on‑screen text (OCR) to infer steps (e.g., "Opened Device Manager → Updated driver").
**AC**: On reference workflows, step precision ≥ 90%, recall ≥ 80%.

**FR‑A3** Problem/Actions/Result/Next Steps Classification (PAR‑N).
**AC**: ≥ 95% of reports contain all 4 sections with appropriate content types.

**FR‑A4** Suggestions & Normalization (style/terminology).
**AC**: Editor shows inline suggestions within 500ms after focus.

### 7.3 Documentation Output & Editing

**FR‑D1** Editor supports rich text, bullets, code blocks, images (screenshots), and timeline.
**AC**: Undo/redo; tracked changes stored in audit trail.

**FR‑D2** Templates & Branding (internal vs. customer‑facing).
**AC**: Per‑team templates; tokenized fields ({{ticketId}}, {{customer}}, {{sla}}).

**FR‑D3** Export & Sync
**AC**: ServiceNow/Jira/Zendesk exports map to configurable fields; retries with exponential backoff; failure surfaced with remediation.

### 7.4 Data Management & Access

**FR‑M1** RBAC roles: Agent, Manager, Admin, Auditor.
**AC**: Row‑level access; least‑privilege defaults.

**FR‑M2** Retention & Residency
**AC**: Admin can set retention per artifact type (media vs. transcript vs. report). Region selection at tenant creation.

**FR‑M3** Search
**AC**: Full‑text and semantic search across transcript, actions, tags; p95 < 800ms for top‑k=10.

### 7.5 Admin, Audit, and Compliance

**FR‑S1** SSO (SAML/OIDC) and SCIM provisioning.
**AC**: IdP‑initiated and SP‑initiated flows; user deprovisioned within 5 minutes.

**FR‑S2** Audit Trails
**AC**: Every view/export/edit produces an immutable log entry with actor, time, object, IP.

**FR‑S3** DLP/Redaction
**AC**: Built‑in detectors for PAN, SSN, email, phone, auth tokens; redaction preview before export.

---

## 8) Non‑Functional Requirements (NFRs)

* **Security**: AES‑256 at rest, TLS 1.3; signed URLs; KMS‑backed key rotation; per‑tenant data isolation.
* **Compliance Targets**: SOC 2 Type II, ISO 27001, GDPR/CCPA; HIPAA BAAs for eligible tiers.
* **Reliability**: Monthly uptime ≥ 99.9% (Pro), 99.99% (Enterprise). RPO ≤ 1h, RTO ≤ 4h.
* **Performance**: ASR p95 < 2s; compose p95 < 10s; search p95 < 800ms; export p95 < 5s to ITSM.
* **Scalability**: Horizontally scale to **5,000 concurrent sessions** at GA; autoscaling ingest.
* **Privacy**: Privacy‑by‑design; consent surfaces; opt‑in content keystrokes; customer‑facing privacy notice templates.
* **Accessibility**: WCAG 2.2 AA for web app.
* **Localization**: Framework ready; EN‑US at GA.

---

## 9) System Architecture (High Level)

* **Capture Clients**:

  * Native desktop (Electron/Swift/WinUI) for screen/audio; hotkeys; local pre‑buffer & emergency pause.
  * Optional browser extension for web‑only capture.
* **Ingestion**: Secure WebRTC/GRPC streams → gateway → event bus (e.g., Kafka) → storage.
* **Services**:

  * **ASR Service** (streaming).
  * **Vision/OCR & Event Fusion** (map UI events + OCR text to steps).
  * **Orchestrator/Composer** (PAR‑N builder, template engine).
  * **Export Integrations** (ServiceNow/Jira/Zendesk via OAuth2 + webhooks).
  * **Search/Index** (vector + keyword).
* **Storage**: Object store (media), relational DB (metadata), vector DB (semantic), log store (audit).
* **Observability**: Centralized metrics, tracing, and alerts (p95 latencies, error rates, ASR WER).

---

## 10) Data Model (Key Entities)

* **Session**: id, agentId, customerId, start/end, sources, consent flags, media URIs.
* **Event**: timestamp, type (click, window, ocr, asr), payload.
* **Report**: sessionId, problem, actions\[], result, nextSteps\[], tags, timeline\[], redactions, editorChanges, exportStatus.
* **IntegrationMapping**: tenantId, target (ServiceNow/Jira/Zendesk), field map, auth.

---

## 11) Integrations (v1 Targets)

* **ServiceNow**: Create/Update Incident → short\_description, description (PAR‑N), work\_notes (timeline), attachments (PDF/MD).
* **Jira**: Create Issue → summary, description; or append comment to existing.
* **Zendesk**: Append internal note + attachment; update custom fields.
* **Cloud Storage**: OneDrive/Google Drive/SharePoint for file copies (optional).
* **SSO/SCIM**: Okta, Azure AD, Google Workspace.

---

## 12) UX & Content Guidelines

* **Tone**: Clear, concise, professional; no "AI‑speak."
* **Report Template (default)**:

  * **Problem**: One‑sentence statement + evidence.
  * **Actions**: Ordered steps with timestamps and rationale.
  * **Result**: Outcome + validation check.
  * **Next Steps**: Follow‑ups, owner, due date.
  * **Timeline**: Collapsible event stream.
* **Editing Aids**: term standardizer, snippet insert, grammar/style suggestions, PII warnings.
* **Hotkeys**: Start/stop, pause, mark milestone, add note, quick‑redact.

**Example Output (abridged)**

> **Problem**: Customer's laptop would not connect to Wi‑Fi (SSID: Campus‑Secure).
> **Actions**: (1) Verified adapter enabled; (2) Forgot network & rejoined; (3) Updated Intel AX211 driver; (4) Reset Winsock; (5) Validated DHCP lease.
> **Result**: Device connected; ping to gateway < 5ms; internet reachable.
> **Next Steps**: Monitor for 24h; if recurs, replace NIC. Owner: T1 Queue. Due: 2025‑09‑16.

---

## 13) Privacy, Compliance & Trust

* Explicit consent & **recording indicator**; customer‑facing notice templates.
* **DLP**: Automatic detection + redaction for PAN/SSN/PII/secrets; admin blocklists.
* **No keystroke content** by default; opt‑in with just‑in‑time education.
* **Data Subject Requests**: export/delete within SLA.
* **Legal Holds**: lock records from deletion.
* **Breach & Incident Response**: 72‑hour notice pathways, runbooks.
* **Regional Processing**: choose US/EU at tenant creation.

---

## 14) Analytics & QA

* **Team Dashboard**: docs/ticket, time saved, edit rates, top issues, deflection hints.
* **Quality Review**: sampling, scorecards, comment threads; export to CSV/BI.
* **Model Feedback Loop**: thumbs up/down, inline corrections feeding eval sets.

---

## 15) Release Plan

**Alpha (Private, 6–8 design partners)**

* macOS + Windows desktop recorder, ASR, PAR‑N composer, PDF export.
* Manual ServiceNow export (file + copy).
* Core privacy controls (pause, blocklist, redaction).
  **Exit Criteria**: ≥ 50% TTD reduction; WER ≤ 15%; 10K+ minutes captured.

**Beta (Private → Public Waitlist)**

* OAuth integrations (ServiceNow/Jira/Zendesk), RBAC, dashboard, search.
* Browser extension (web‑only), snippet library, analytics.
  **Exit Criteria**: export failure < 1%; step precision ≥ 90%; 30 design partners.

**GA**

* SSO/SCIM, audit logs, retention, multi‑region, SLA.
* SOC2 readiness.

---

## 16) Risks & Mitigations

* **Privacy miscapture** (e.g., confidential window recorded).
  ↳ Aggressive default exclusions, visual watermark, hotkey pause, admin blocklists, post‑capture scrub.
* **ASR errors** on accents/noise.
  ↳ Noise suppression, domain vocabulary, active learning, manual edits fast.
* **Action recognition drift** as apps update.
  ↳ Telemetry/eval harness, versioned detectors, fall back to OCR + heuristics.
* **Change management/adoption**.
  ↳ In‑product onboarding, quick wins, ROI dashboard, manager champions.
* **Integration quota limits**.
  ↳ Backoff/retry, rate limiters, admin alerts.

---

## 17) Assumptions

* Agents are already operating within an ITSM/CRM.
* Desktop capture is acceptable with organization consent.
* Teams will allow audio recording for QA/documentation.

---

## 18) Open Questions / Decisions Needed

1. Which regions at GA (US‑East, EU‑West)?
2. Minimum supported OS versions (macOS 13+, Windows 10 22H2+)?
3. Default retention (90 days?) and tiered overrides.
4. Pricing & packaging (per‑seat vs usage + enterprise features).
5. First‑class app detectors (which app list at launch?).
6. HIPAA eligibility at GA or post‑GA?

---

## 19) Appendices

### A) Event Taxonomy (abridged)

* asr.transcript, asr.word, ui.click, ui.inputMeta, window\.focus, app.launch, net.change, ocr.text, user.note, privacy.pause/resume.

### B) Search Facets

* agent, customer, app, domain, tags, issue type, date range, export target.

### C) Support & SLAs (target)

* Pro: 99.9% uptime; 24×5 support; 2‑business‑day response.
* Enterprise: 99.99% uptime; 24×7 P1; 1‑hour initial response; named CSM.