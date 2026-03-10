import { StageCategory, Deal } from '@winnow/core';

export interface ScenarioConfig {
  name: string;
  dealCount: number;
  // Distribution of deal "health" statuses
  distribution: {
    healthy: number;               // Percentage of deals that are healthy (0-100)
    unrealisticCloseDate: number;  // Percentage with close date issues
    missingBuyingCommittee: number;
    staleDeals: number;            // Stage-activity mismatch
  };
  // Pipeline configuration
  pipeline: {
    stages: { name: string; category: StageCategory; probability: number }[];
  };
  // Deal generation params
  dealParams: {
    amountRange: { min: number; max: number };  // In cents
    cycleLengthRange: { min: number; max: number };  // Days
    contactsRange: { min: number; max: number };
  };
  // Historical closed-won deals for benchmark computation
  closedWonCount: number;
}

export type DealHealthStatus = 'healthy' | 'unrealisticCloseDate' | 'missingBuyingCommittee' | 'stale';

export interface GeneratedPipeline {
  organization: {
    id: string;
    name: string;
    crmType: string;
    crmConnectedAt: Date;
    createdAt: Date;
  };
  pipeline: {
    id: string;
    externalId: string;
    name: string;
    organizationId: string;
  };
  stages: {
    id: string;
    externalId: string;
    name: string;
    displayOrder: number;
    probability: number;
    isClosed: boolean;
    isWon: boolean;
    category: StageCategory;
    pipelineId: string;
  }[];
  deals: Deal[];
  closedWonDeals: Deal[];
}
