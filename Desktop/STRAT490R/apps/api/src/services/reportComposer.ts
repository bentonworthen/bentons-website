interface Session {
  id: string;
  customerId?: string;
  customerName?: string;
  startedAt: Date;
  endedAt?: Date;
  events: Event[];
}

interface Event {
  id: string;
  timestamp: Date;
  type: string;
  payload: any;
  speakerTag?: string;
  confidence?: number;
}

interface PARNReport {
  problem: string;
  actions: Array<{
    step: number;
    description: string;
    timestamp?: string;
    screenshot?: string;
  }>;
  result: string;
  nextSteps: Array<{
    description: string;
    owner?: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  tags: string[];
  timeline: Array<{
    timestamp: string;
    event: string;
    details?: string;
  }>;
}

export async function generatePARNReport(session: Session): Promise<PARNReport> {
  // In a real implementation, this would use AI/LLM to analyze the session events
  // For demo purposes, we'll create a structured report based on event patterns

  const transcripts = session.events
    .filter(e => e.type === 'asr_transcript')
    .map(e => e.payload?.text)
    .filter(Boolean);

  const uiEvents = session.events
    .filter(e => e.type.startsWith('ui_'))
    .map(e => ({
      timestamp: e.timestamp,
      action: e.payload?.action || 'Unknown action',
      target: e.payload?.target || 'Unknown target',
    }));

  // Analyze problem from early transcripts
  const problem = extractProblem(transcripts.slice(0, 5));

  // Generate actions from UI events and transcripts
  const actions = generateActions(uiEvents, transcripts);

  // Determine result from later transcripts
  const result = extractResult(transcripts.slice(-3));

  // Generate next steps
  const nextSteps = generateNextSteps(problem, result);

  // Extract tags
  const tags = extractTags(transcripts, uiEvents);

  // Create timeline
  const timeline = createTimeline(session.events);

  return {
    problem,
    actions,
    result,
    nextSteps,
    tags,
    timeline,
  };
}

function extractProblem(earlyTranscripts: string[]): string {
  const text = earlyTranscripts.join(' ').toLowerCase();

  // Common IT problem patterns
  if (text.includes('wifi') || text.includes('wi-fi') || text.includes('network')) {
    return "Customer experiencing WiFi connectivity issues.";
  }
  if (text.includes('password') || text.includes('login') || text.includes('access')) {
    return "Customer unable to access account due to authentication issues.";
  }
  if (text.includes('printer') || text.includes('print')) {
    return "Customer experiencing printer connectivity/functionality issues.";
  }
  if (text.includes('slow') || text.includes('performance')) {
    return "Customer reporting slow system performance.";
  }
  if (text.includes('email') || text.includes('outlook')) {
    return "Customer experiencing email client issues.";
  }

  return "Customer reported technical issue requiring assistance.";
}

function generateActions(uiEvents: any[], transcripts: string[]): Array<{
  step: number;
  description: string;
  timestamp?: string;
}> {
  const actions: Array<{
    step: number;
    description: string;
    timestamp?: string;
  }> = [];

  let stepNumber = 1;

  // Convert UI events to action descriptions
  uiEvents.forEach((event, index) => {
    if (index < 10) { // Limit to first 10 actions
      let description = '';

      switch (event.action) {
        case 'click':
          description = `Clicked on ${event.target}`;
          break;
        case 'type':
          description = `Entered information in ${event.target}`;
          break;
        case 'navigate':
          description = `Navigated to ${event.target}`;
          break;
        default:
          description = `Performed ${event.action} on ${event.target}`;
      }

      actions.push({
        step: stepNumber++,
        description,
        timestamp: event.timestamp.toISOString(),
      });
    }
  });

  // Add common troubleshooting steps if no UI events
  if (actions.length === 0) {
    actions.push(
      {
        step: 1,
        description: "Verified customer's current system status",
      },
      {
        step: 2,
        description: "Gathered additional information about the issue",
      },
      {
        step: 3,
        description: "Applied recommended troubleshooting steps",
      }
    );
  }

  return actions;
}

function extractResult(lateTranscripts: string[]): string {
  const text = lateTranscripts.join(' ').toLowerCase();

  if (text.includes('working') || text.includes('fixed') || text.includes('resolved')) {
    return "Issue successfully resolved. Customer confirmed functionality is restored.";
  }
  if (text.includes('escalate') || text.includes('tier 2') || text.includes('specialist')) {
    return "Issue requires escalation to specialist team for advanced troubleshooting.";
  }
  if (text.includes('reboot') || text.includes('restart') || text.includes('later')) {
    return "Applied initial troubleshooting steps. Customer to restart system and monitor.";
  }

  return "Troubleshooting steps completed. Customer to test and report back if issues persist.";
}

function generateNextSteps(problem: string, result: string): Array<{
  description: string;
  owner?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}> {
  const nextSteps: Array<{
    description: string;
    owner?: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
  }> = [];

  if (result.includes('escalation') || result.includes('specialist')) {
    nextSteps.push({
      description: "Escalate to Tier 2 support for advanced troubleshooting",
      owner: "T2 Queue",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'high',
    });
  } else if (result.includes('resolved')) {
    nextSteps.push({
      description: "Follow up with customer in 24 hours to ensure continued functionality",
      owner: "T1 Queue",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'low',
    });
  } else {
    nextSteps.push({
      description: "Monitor for customer callback within 48 hours",
      owner: "T1 Queue",
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'medium',
    });
  }

  return nextSteps;
}

function extractTags(transcripts: string[], uiEvents: any[]): string[] {
  const tags: string[] = [];
  const text = transcripts.join(' ').toLowerCase();

  // Technology tags
  if (text.includes('wifi') || text.includes('network')) tags.push('network');
  if (text.includes('printer')) tags.push('printer');
  if (text.includes('email') || text.includes('outlook')) tags.push('email');
  if (text.includes('windows') || text.includes('mac')) tags.push('os');
  if (text.includes('password') || text.includes('login')) tags.push('authentication');

  // Severity tags
  if (text.includes('urgent') || text.includes('critical')) tags.push('high-priority');
  if (text.includes('slow') || text.includes('performance')) tags.push('performance');

  // Resolution tags
  if (text.includes('resolved') || text.includes('fixed')) tags.push('resolved');
  if (text.includes('escalate')) tags.push('escalated');

  return [...new Set(tags)]; // Remove duplicates
}

function createTimeline(events: Event[]): Array<{
  timestamp: string;
  event: string;
  details?: string;
}> {
  return events
    .filter(e => ['asr_transcript', 'ui_click', 'window_focus'].includes(e.type))
    .slice(0, 20) // Limit timeline entries
    .map(e => ({
      timestamp: e.timestamp.toISOString(),
      event: formatEventForTimeline(e),
      details: e.payload?.text || e.payload?.target || undefined,
    }));
}

function formatEventForTimeline(event: Event): string {
  switch (event.type) {
    case 'asr_transcript':
      return `${event.speakerTag || 'Speaker'} spoke`;
    case 'ui_click':
      return 'UI interaction';
    case 'window_focus':
      return 'Window changed';
    default:
      return event.type.replace('_', ' ');
  }
}