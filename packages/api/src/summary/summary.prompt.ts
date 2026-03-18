import type { HubSpotActivityContent } from '../hubspot/types/hubspot-api.types';

interface DealSnapshot {
  name: string;
  ownerName: string;
  stageName: string;
  daysInStage: number;
  amountDollars: number;
  closeDateStr: string;
  daysUntilClose: number;
  contacts: { name: string; title: string | null }[];
}

interface FindingSnapshot {
  severity: string;
  title: string;
  description: string;
}

const OUTPUT_SCHEMA = `{
  "summary": "<2-3 sentences: current deal status and primary concern>",
  "lastActivityContext": "<1 sentence: what the most recent activity was about>",
  "recommendedAction": "<1 concrete action the manager should take>",
  "riskSignals": ["<signal 1>", "<signal 2>"]
}`;

export function buildSystemPrompt(): string {
  return (
    'You are a revenue operations analyst helping a sales manager quickly understand deal health.\n' +
    'You will be given structured data about a deal, validation findings from an automated pipeline audit, ' +
    'and recent CRM activity from HubSpot.\n' +
    'Produce a concise, factual deal brief. Be direct. Use specific numbers. ' +
    'Do not speculate beyond what the data shows. Do not use filler phrases.\n' +
    'Output valid JSON matching the schema provided.'
  );
}

export function buildUserPrompt(
  deal: DealSnapshot,
  findings: FindingSnapshot[],
  activities: HubSpotActivityContent[],
): string {
  const contactLines = deal.contacts.length
    ? deal.contacts.map((c) => `  - ${c.name}${c.title ? ` (${c.title})` : ''}`).join('\n')
    : '  - (no contacts)';

  const findingLines = findings.length
    ? findings.map((f) => `[${f.severity.toUpperCase()}] ${f.title}: ${f.description}`).join('\n')
    : '(no findings)';

  const activityLines = activities.length
    ? activities
        .map((a) => `[${a.type} - ${a.timestamp.toISOString().slice(0, 10)}] ${a.content}`)
        .join('\n')
    : '(no activities logged)';

  const closeLabel =
    deal.daysUntilClose >= 0
      ? `${deal.daysUntilClose} days away`
      : `${Math.abs(deal.daysUntilClose)} days overdue`;

  return [
    '## Deal',
    `Name: ${deal.name}`,
    `Owner: ${deal.ownerName}`,
    `Stage: ${deal.stageName} (entered ${deal.daysInStage} days ago)`,
    `Amount: $${deal.amountDollars.toLocaleString('en-US')}`,
    `Close Date: ${deal.closeDateStr} (${closeLabel})`,
    `Contacts (${deal.contacts.length}):`,
    contactLines,
    '',
    '## Pipeline Validation Findings',
    findingLines,
    '',
    `## Recent CRM Activity (${activities.length} activities, last 90 days)`,
    activityLines,
    '',
    '## Required Output (JSON)',
    OUTPUT_SCHEMA,
  ].join('\n');
}
