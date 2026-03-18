interface FindingRecord {
  severity: string;
  title: string;
}

export interface SummaryOutput {
  summary: string;
  lastActivityContext: string;
  recommendedAction: string;
  riskSignals: string[];
  source: 'ai' | 'fallback';
}

export function buildFallbackSummary(
  dealName: string,
  findings: FindingRecord[],
): SummaryOutput {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');

  const topFinding = errors[0] ?? warnings[0];

  return {
    summary: `${dealName} has ${errors.length} critical issue(s) and ${warnings.length} warning(s) flagged by the pipeline validator. No CRM activity data is available for additional context.`,
    lastActivityContext: 'No activities logged in HubSpot for this deal.',
    recommendedAction: topFinding
      ? `Review the "${topFinding.title}" finding with the deal owner before the next forecast call.`
      : 'Review this deal with the owner.',
    riskSignals: findings.map((f) => `[${f.severity}] ${f.title}`),
    source: 'fallback',
  };
}
