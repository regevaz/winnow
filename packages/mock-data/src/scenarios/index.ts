import { ScenarioConfig } from '../types';

const DEFAULT_PIPELINE_STAGES = [
  { name: 'Discovery', category: 'qualification' as const, probability: 10 },
  { name: 'Qualification', category: 'qualification' as const, probability: 20 },
  { name: 'Demo Scheduled', category: 'evaluation' as const, probability: 40 },
  { name: 'Evaluation', category: 'evaluation' as const, probability: 50 },
  { name: 'Proposal Sent', category: 'proposal' as const, probability: 70 },
  { name: 'Negotiation', category: 'proposal' as const, probability: 80 },
  { name: 'Contract Review', category: 'closing' as const, probability: 90 },
  { name: 'Closed Won', category: 'closed_won' as const, probability: 100 },
  { name: 'Closed Lost', category: 'closed_lost' as const, probability: 0 },
];

export const SCENARIOS: Record<string, ScenarioConfig> = {
  healthy: {
    name: 'healthy',
    dealCount: 40,
    distribution: {
      healthy: 80,
      unrealisticCloseDate: 10,
      missingBuyingCommittee: 5,
      staleDeals: 5,
    },
    pipeline: {
      stages: DEFAULT_PIPELINE_STAGES,
    },
    dealParams: {
      amountRange: { min: 500000, max: 20000000 },  // $5k - $200k
      cycleLengthRange: { min: 30, max: 120 },
      contactsRange: { min: 1, max: 6 },
    },
    closedWonCount: 30,
  },

  problematic: {
    name: 'problematic',
    dealCount: 40,
    distribution: {
      healthy: 30,
      unrealisticCloseDate: 30,
      missingBuyingCommittee: 25,
      staleDeals: 15,
    },
    pipeline: {
      stages: DEFAULT_PIPELINE_STAGES,
    },
    dealParams: {
      amountRange: { min: 500000, max: 20000000 },
      cycleLengthRange: { min: 30, max: 120 },
      contactsRange: { min: 1, max: 6 },
    },
    closedWonCount: 25,
  },

  'unrealistic-dates': {
    name: 'unrealistic-dates',
    dealCount: 30,
    distribution: {
      healthy: 40,
      unrealisticCloseDate: 60,
      missingBuyingCommittee: 0,
      staleDeals: 0,
    },
    pipeline: {
      stages: DEFAULT_PIPELINE_STAGES,
    },
    dealParams: {
      amountRange: { min: 1000000, max: 15000000 },  // $10k - $150k
      cycleLengthRange: { min: 45, max: 90 },
      contactsRange: { min: 2, max: 5 },
    },
    closedWonCount: 25,
  },

  'thin-committees': {
    name: 'thin-committees',
    dealCount: 30,
    distribution: {
      healthy: 40,
      unrealisticCloseDate: 0,
      missingBuyingCommittee: 60,
      staleDeals: 0,
    },
    pipeline: {
      stages: DEFAULT_PIPELINE_STAGES,
    },
    dealParams: {
      amountRange: { min: 2000000, max: 25000000 },  // $20k - $250k (larger deals)
      cycleLengthRange: { min: 60, max: 120 },
      contactsRange: { min: 1, max: 3 },  // Intentionally low for this scenario
    },
    closedWonCount: 20,
  },

  'stale-pipeline': {
    name: 'stale-pipeline',
    dealCount: 30,
    distribution: {
      healthy: 40,
      unrealisticCloseDate: 0,
      missingBuyingCommittee: 0,
      staleDeals: 60,
    },
    pipeline: {
      stages: DEFAULT_PIPELINE_STAGES,
    },
    dealParams: {
      amountRange: { min: 500000, max: 15000000 },
      cycleLengthRange: { min: 30, max: 100 },
      contactsRange: { min: 2, max: 5 },
    },
    closedWonCount: 20,
  },

  mixed: {
    name: 'mixed',
    dealCount: 50,
    distribution: {
      healthy: 50,
      unrealisticCloseDate: 20,
      missingBuyingCommittee: 20,
      staleDeals: 10,
    },
    pipeline: {
      stages: DEFAULT_PIPELINE_STAGES,
    },
    dealParams: {
      amountRange: { min: 500000, max: 25000000 },  // $5k - $250k
      cycleLengthRange: { min: 30, max: 150 },
      contactsRange: { min: 1, max: 8 },
    },
    closedWonCount: 40,
  },
};

export function getScenario(name: string): ScenarioConfig {
  const scenario = SCENARIOS[name];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${name}. Available: ${Object.keys(SCENARIOS).join(', ')}`);
  }
  return scenario;
}

export const DEFAULT_SCENARIO = 'mixed';
