export interface DealContextSummary {
  dealId: string;
  summary: string;
  lastActivityContext: string;
  recommendedAction: string;
  riskSignals: string[];
  generatedAt: Date;
  activityCount: number;
  confidence: 'high' | 'low';
  source: 'ai' | 'fallback';
}
