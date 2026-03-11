import { StageActivityMismatchValidator } from '../src/validators/stage-activity-mismatch.validator';
import {
  Deal,
  DealStage,
  DealActivity,
  StageChange,
  StageCategory,
  BenchmarkMetadata,
  StageMapping,
} from '../src/types';
import { ValidationContext } from '../src/engine/validator.interface';

const CURRENT_DATE = new Date('2025-01-15T12:00:00Z');
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysAgo(days: number): Date {
  const d = new Date(CURRENT_DATE.getTime() - days * MS_PER_DAY);
  return d;
}

function createDeal(options: {
  stageCategory?: StageCategory;
  stageId?: string;
  stageName?: string;
  isClosed?: boolean;
  activities?: DealActivity[];
  stageHistory?: StageChange[];
  createdAt?: Date;
}): Deal {
  const {
    stageId = 'stage-eval',
    stageName = 'Evaluation',
    isClosed = false,
    activities = [],
    stageHistory = [],
    createdAt = new Date('2024-06-01T00:00:00Z'),
  } = options;

  const stage: DealStage = {
    id: stageId,
    name: stageName,
    displayOrder: 2,
    probability: 50,
    isClosed,
    isWon: false,
  };

  return {
    id: 'deal-1',
    externalId: 'ext-1',
    name: 'Test Deal',
    stage,
    stageId,
    amount: 5000000,
    currency: 'USD',
    closeDate: new Date('2025-03-01'),
    createdAt,
    lastModifiedAt: createdAt,
    ownerId: 'owner-1',
    ownerName: 'Owner',
    pipelineId: 'pipeline-1',
    contacts: [],
    activities,
    stageHistory,
  };
}

function createContext(stageMappings?: StageMapping[]): ValidationContext {
  const defaults: StageMapping[] = [
    { stageId: 'stage-qual', stageName: 'Qualification', category: 'qualification' },
    { stageId: 'stage-eval', stageName: 'Evaluation', category: 'evaluation' },
    { stageId: 'stage-prop', stageName: 'Proposal', category: 'proposal' },
    { stageId: 'stage-close', stageName: 'Closing', category: 'closing' },
  ];
  const benchmarks: BenchmarkMetadata = {
    closedWonDealsAnalyzed: 30,
    medianCycleLength: 75,
    cycleLengthBySegment: [],
    stageDistribution: [],
    contactCountBySegment: [],
    confidence: 'high',
    message: null,
  };
  return {
    benchmarks,
    stageMappings: stageMappings ?? defaults,
    currentDate: CURRENT_DATE,
  };
}

describe('StageActivityMismatchValidator', () => {
  let validator: StageActivityMismatchValidator;

  beforeEach(() => {
    validator = new StageActivityMismatchValidator();
  });

  it('passes when deal in evaluation has recent stage_change (5 days ago)', () => {
    const deal = createDeal({
      stageCategory: 'evaluation',
      stageId: 'stage-eval',
      stageName: 'Evaluation',
      activities: [
        { id: 'a1', type: 'stage_change', timestamp: daysAgo(5), description: null },
      ],
      stageHistory: [
        { fromStage: 'stage-qual', toStage: 'stage-eval', changedAt: daysAgo(10) },
      ],
    });
    const context = createContext();
    const result = validator.validate(deal, context);
    expect(result).toBeNull();
  });

  it('flags warning when deal in evaluation has no activity for 16 days', () => {
    const deal = createDeal({
      stageCategory: 'evaluation',
      stageId: 'stage-eval',
      stageName: 'Evaluation',
      activities: [
        { id: 'a1', type: 'stage_change', timestamp: daysAgo(16), description: null },
      ],
      stageHistory: [
        { fromStage: 'stage-qual', toStage: 'stage-eval', changedAt: daysAgo(20) },
      ],
    });
    const context = createContext();
    const result = validator.validate(deal, context);
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('warning');
    expect(result?.validatorId).toBe('stage_activity_mismatch');
    expect(result?.dataPoints.daysSinceActivity).toBe(16);
    expect(result?.dataPoints.threshold).toEqual({ warning: 14, error: 28 });
  });

  it('flags error when deal in proposal has no activity for 25 days', () => {
    const deal = createDeal({
      stageCategory: 'proposal',
      stageId: 'stage-prop',
      stageName: 'Proposal',
      activities: [
        { id: 'a1', type: 'stage_change', timestamp: daysAgo(25), description: null },
      ],
      stageHistory: [
        { fromStage: 'stage-eval', toStage: 'stage-prop', changedAt: daysAgo(30) },
      ],
    });
    const context = createContext();
    const result = validator.validate(deal, context);
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('error');
    expect(result?.dataPoints.daysSinceActivity).toBe(25);
    expect(result?.dataPoints.threshold).toEqual({ warning: 10, error: 21 });
  });

  it('flags warning in closing with tighter threshold (8 days no activity)', () => {
    const deal = createDeal({
      stageCategory: 'closing',
      stageId: 'stage-close',
      stageName: 'Closing',
      activities: [
        { id: 'a1', type: 'stage_change', timestamp: daysAgo(8), description: null },
      ],
      stageHistory: [
        { fromStage: 'stage-prop', toStage: 'stage-close', changedAt: daysAgo(10) },
      ],
    });
    const context = createContext();
    const result = validator.validate(deal, context);
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('warning');
    expect(result?.dataPoints.daysSinceActivity).toBe(8);
    expect(result?.dataPoints.threshold).toEqual({ warning: 7, error: 14 });
  });

  it('does not flag qualification with 18 days no activity (threshold 21)', () => {
    const deal = createDeal({
      stageCategory: 'qualification',
      stageId: 'stage-qual',
      stageName: 'Qualification',
      activities: [
        { id: 'a1', type: 'stage_change', timestamp: daysAgo(18), description: null },
      ],
      stageHistory: [
        { fromStage: 'stage-0', toStage: 'stage-qual', changedAt: daysAgo(20) },
      ],
    });
    const context = createContext();
    const result = validator.validate(deal, context);
    expect(result).toBeNull();
  });

  it('ignores field_updated and uses last meaningful activity (proposal, error)', () => {
    const deal = createDeal({
      stageCategory: 'proposal',
      stageId: 'stage-prop',
      stageName: 'Proposal',
      activities: [
        { id: 'a1', type: 'stage_change', timestamp: daysAgo(22), description: null },
        { id: 'a2', type: 'field_updated', timestamp: daysAgo(5), description: null },
      ],
      stageHistory: [
        { fromStage: 'stage-eval', toStage: 'stage-prop', changedAt: daysAgo(25) },
      ],
    });
    const context = createContext();
    const result = validator.validate(deal, context);
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('error');
    expect(result?.dataPoints.daysSinceActivity).toBe(22);
    expect(result?.dataPoints.lastActivityType).toBe('stage_change');
  });

  it('skips closed deals', () => {
    const deal = createDeal({
      stageCategory: 'closed_won',
      stageId: 'stage-won',
      stageName: 'Closed Won',
      isClosed: true,
      activities: [],
      stageHistory: [],
    });
    const mappings: StageMapping[] = [
      { stageId: 'stage-qual', stageName: 'Qualification', category: 'qualification' },
      { stageId: 'stage-eval', stageName: 'Evaluation', category: 'evaluation' },
      { stageId: 'stage-prop', stageName: 'Proposal', category: 'proposal' },
      { stageId: 'stage-close', stageName: 'Closing', category: 'closing' },
      { stageId: 'stage-won', stageName: 'Closed Won', category: 'closed_won' },
    ];
    const context = createContext(mappings);
    const result = validator.validate(deal, context);
    expect(result).toBeNull();
  });

  it('does not flag brand new deal (created 2 days ago, no activity)', () => {
    const deal = createDeal({
      stageCategory: 'evaluation',
      stageId: 'stage-eval',
      stageName: 'Evaluation',
      activities: [],
      stageHistory: [
        { fromStage: 'stage-qual', toStage: 'stage-eval', changedAt: daysAgo(2) },
      ],
      createdAt: daysAgo(2),
    });
    const context = createContext();
    const result = validator.validate(deal, context);
    expect(result).toBeNull();
  });

  it('uses deal.createdAt when no activities exist', () => {
    const deal = createDeal({
      stageCategory: 'evaluation',
      stageId: 'stage-eval',
      stageName: 'Evaluation',
      activities: [],
      stageHistory: [],
      createdAt: daysAgo(20),
    });
    const context = createContext();
    const result = validator.validate(deal, context);
    expect(result).not.toBeNull();
    expect(result?.dataPoints.daysSinceActivity).toBe(20);
    expect(result?.dataPoints.lastActivityType).toBeNull();
  });

  it('includes stageEnteredDate and daysInCurrentStage in dataPoints', () => {
    const stageEntered = daysAgo(25);
    const deal = createDeal({
      stageCategory: 'proposal',
      stageId: 'stage-prop',
      stageName: 'Proposal',
      activities: [{ id: 'a1', type: 'stage_change', timestamp: daysAgo(25), description: null }],
      stageHistory: [
        { fromStage: 'stage-eval', toStage: 'stage-prop', changedAt: stageEntered },
      ],
    });
    const context = createContext();
    const result = validator.validate(deal, context);
    expect(result).not.toBeNull();
    expect(result?.dataPoints.stageEnteredDate).toEqual(stageEntered);
    expect(result?.dataPoints.daysInCurrentStage).toBe(25);
  });
});
