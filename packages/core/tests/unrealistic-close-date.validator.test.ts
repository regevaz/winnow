import { UnrealisticCloseDateValidator } from '../src/validators/unrealistic-close-date.validator';
import {
  Deal,
  BenchmarkMetadata,
  StageMapping,
  DealStage,
  ConfidenceLevel,
  StageCategory,
} from '../src/types';
import { ValidationContext } from '../src/engine/validator.interface';

describe('UnrealisticCloseDateValidator', () => {
  let validator: UnrealisticCloseDateValidator;
  let currentDate: Date;

  beforeEach(() => {
    validator = new UnrealisticCloseDateValidator();
    currentDate = new Date('2025-01-01T00:00:00Z');
  });

  describe('Basic validation', () => {
    it('should pass for a deal with reasonable close date', () => {
      const deal = createDeal({
        stageCategory: 'qualification',
        closeDateDaysFromNow: 60,
      });

      const context = createContext({
        medianCycleDays: 75,
        stageCategory: 'qualification',
      });

      const result = validator.validate(deal, context);

      expect(result).toBeNull();
    });

    it('should skip closed deals', () => {
      const deal = createDeal({
        stageCategory: 'closed_won',
        closeDateDaysFromNow: 5,
        isClosed: true,
        isWon: true,
      });

      const context = createContext({
        medianCycleDays: 90,
        stageCategory: 'closed_won',
      });

      const result = validator.validate(deal, context);

      expect(result).toBeNull();
    });
  });

  describe('Error scenarios', () => {
    it('should flag error when close date is way too soon', () => {
      const deal = createDeal({
        stageCategory: 'qualification',
        closeDateDaysFromNow: 5,
      });

      const context = createContext({
        medianCycleDays: 90,
        stageCategory: 'qualification',
        confidence: 'high',
      });

      const result = validator.validate(deal, context);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('error');
      expect(result?.title).toBe('Unrealistic Close Date');
      expect(result?.dataPoints.ratio).toBeLessThan(0.3);
      expect(result?.dataPoints.actualRemainingDays).toBe(5);
      expect(result?.dataPoints.medianCycleDays).toBe(90);
      expect(result?.confidence).toBe('high');
    });

    it('should flag error when close date has passed', () => {
      const deal = createDeal({
        stageCategory: 'evaluation',
        closeDateDaysFromNow: -10,
      });

      const context = createContext({
        medianCycleDays: 80,
        stageCategory: 'evaluation',
      });

      const result = validator.validate(deal, context);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('error');
      expect(result?.title).toBe('Close Date Has Passed');
      expect(result?.description).toContain('10 days ago');
      expect(result?.description).toContain('still in Evaluation');
      expect(result?.dataPoints.actualRemainingDays).toBe(-10);
    });

    it('should flag error for large deal with very short timeline', () => {
      const deal = createDeal({
        amount: 12000000, // $120k
        stageCategory: 'qualification',
        closeDateDaysFromNow: 20,
      });

      const benchmarks = createBenchmarksWithSegments([
        { minAmount: 0, maxAmount: 10000000, medianCycleDays: 60, dealCount: 30 },
        { minAmount: 10000000, maxAmount: Infinity, medianCycleDays: 120, dealCount: 25 },
      ]);

      const context: ValidationContext = {
        benchmarks,
        stageMappings: [
          { stageId: 'stage-1', stageName: 'Qualification', category: 'qualification' },
        ],
        currentDate,
      };

      const result = validator.validate(deal, context);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('error');
      expect(result?.dataPoints.medianCycleDays).toBe(120);
      expect(result?.dataPoints.ratio).toBeLessThan(0.3);
    });
  });

  describe('Warning scenarios', () => {
    it('should flag warning when close date is ambitious but not impossible', () => {
      const deal = createDeal({
        stageCategory: 'evaluation',
        closeDateDaysFromNow: 15,
      });

      // Evaluation is ~25% through (after qualification)
      // So 75% remaining of 80 days = 60 days expected
      // 15 days actual / 60 days expected = 0.25, which is < 0.3 but let's make it 0.35
      // Actually, let me recalculate: if qualification is 25% and evaluation is 30%,
      // then at evaluation we've completed 25%, so 75% remains
      // 80 * 0.75 = 60 expected, 15 actual, ratio = 0.25 → error
      // Let me adjust to get a warning (ratio between 0.3 and 0.5)

      const context = createContext({
        medianCycleDays: 60, // Shorter cycle to get warning range
        stageCategory: 'evaluation',
        stageDistribution: [
          { category: 'qualification', medianPercentOfCycle: 25 },
          { category: 'evaluation', medianPercentOfCycle: 30 },
          { category: 'proposal', medianPercentOfCycle: 25 },
          { category: 'closing', medianPercentOfCycle: 20 },
        ],
      });

      // At evaluation, 25% complete, 75% remains
      // 60 * 0.75 = 45 expected
      // 15 actual / 45 expected = 0.33 → warning

      const result = validator.validate(deal, context);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('warning');
      expect(result?.title).toBe('Ambitious Close Date');
      expect(result?.description).toContain('ambitious');
      expect(result?.dataPoints.ratio).toBeGreaterThanOrEqual(0.3);
      expect(result?.dataPoints.ratio).toBeLessThan(0.5);
    });
  });

  describe('Stage progress calculation', () => {
    it('should calculate cumulative progress correctly for different stages', () => {
      const stageDistribution = [
        { category: 'qualification' as StageCategory, medianPercentOfCycle: 25 },
        { category: 'evaluation' as StageCategory, medianPercentOfCycle: 30 },
        { category: 'proposal' as StageCategory, medianPercentOfCycle: 25 },
        { category: 'closing' as StageCategory, medianPercentOfCycle: 20 },
      ];

      // Qualification (first stage) - 0% complete
      const qualDeal = createDeal({ stageCategory: 'qualification', closeDateDaysFromNow: 70 });
      const qualContext = createContext({ medianCycleDays: 100, stageCategory: 'qualification', stageDistribution });
      const qualResult = validator.validate(qualDeal, qualContext);
      // At qualification, 0% complete, so 100 days expected remaining
      // 70 actual / 100 expected = 0.7 → passes

      expect(qualResult).toBeNull();

      // Proposal (third stage) - 55% complete (25% + 30%)
      const propDeal = createDeal({ stageCategory: 'proposal', closeDateDaysFromNow: 30 });
      const propContext = createContext({ medianCycleDays: 100, stageCategory: 'proposal', stageDistribution });
      const propResult = validator.validate(propDeal, propContext);
      // At proposal, 55% complete, so 45 days expected remaining
      // 30 actual / 45 expected = 0.67 → passes

      expect(propResult).toBeNull();

      // Closing (last stage) - 80% complete
      const closingDeal = createDeal({ stageCategory: 'closing', closeDateDaysFromNow: 5 });
      const closingContext = createContext({ medianCycleDays: 100, stageCategory: 'closing', stageDistribution });
      const closingResult = validator.validate(closingDeal, closingContext);
      // At closing, 80% complete, so 20 days expected remaining
      // 5 actual / 20 expected = 0.25 → error

      expect(closingResult).not.toBeNull();
      expect(closingResult?.severity).toBe('error');
    });
  });

  describe('Benchmark sources and confidence', () => {
    it('should use industry fallback when benchmark confidence is low', () => {
      const deal = createDeal({
        stageCategory: 'qualification',
        closeDateDaysFromNow: 10,
      });

      const benchmarks = createBenchmarksWithSegments(
        [{ minAmount: 0, maxAmount: Infinity, medianCycleDays: 75, dealCount: 0 }],
        'low'
      );

      const context: ValidationContext = {
        benchmarks,
        stageMappings: [
          { stageId: 'stage-1', stageName: 'Qualification', category: 'qualification' },
        ],
        currentDate,
      };

      const result = validator.validate(deal, context);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe('low');
      expect(result?.dataPoints.benchmarkSource).toBe('industry_fallback');
      expect(result?.dataPoints.medianCycleDays).toBe(75);
    });

    it('should have high confidence with 20+ deals in segment', () => {
      const deal = createDeal({
        amount: 3000000, // $30k
        stageCategory: 'qualification',
        closeDateDaysFromNow: 10,
      });

      const benchmarks = createBenchmarksWithSegments(
        [
          { minAmount: 0, maxAmount: 5000000, medianCycleDays: 90, dealCount: 25 },
          { minAmount: 5000000, maxAmount: Infinity, medianCycleDays: 120, dealCount: 20 },
        ],
        'high'
      );

      const context: ValidationContext = {
        benchmarks,
        stageMappings: [
          { stageId: 'stage-1', stageName: 'Qualification', category: 'qualification' },
        ],
        currentDate,
      };

      const result = validator.validate(deal, context);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe('high');
      expect(result?.dataPoints.benchmarkSource).toBe('historical');
      expect(result?.dataPoints.medianCycleDays).toBe(90);
    });

    it('should have medium confidence with < 20 deals in segment', () => {
      const deal = createDeal({
        amount: 3000000,
        stageCategory: 'qualification',
        closeDateDaysFromNow: 10,
      });

      const benchmarks = createBenchmarksWithSegments(
        [
          { minAmount: 0, maxAmount: 5000000, medianCycleDays: 90, dealCount: 15 },
        ],
        'medium'
      );

      const context: ValidationContext = {
        benchmarks,
        stageMappings: [
          { stageId: 'stage-1', stageName: 'Qualification', category: 'qualification' },
        ],
        currentDate,
      };

      const result = validator.validate(deal, context);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe('medium');
    });
  });

  describe('Edge cases', () => {
    it('should handle deals with unknown stage category', () => {
      const deal = createDeal({
        stageCategory: 'qualification',
        closeDateDaysFromNow: 10,
      });

      const context = createContext({
        medianCycleDays: 80,
        stageCategory: 'qualification',
      });

      // Manually override stage mapping to have no matching category
      context.stageMappings = [];

      const result = validator.validate(deal, context);

      // Should still validate, assuming 0% progress
      expect(result).not.toBeNull();
      expect(result?.dataPoints.cumulativeProgress).toBe(0);
    });

    it('should handle deals with no segment match', () => {
      const deal = createDeal({
        amount: 500000000, // Very large amount
        stageCategory: 'qualification',
        closeDateDaysFromNow: 10,
      });

      const benchmarks = createBenchmarksWithSegments(
        [{ minAmount: 0, maxAmount: 10000000, medianCycleDays: 60, dealCount: 20 }],
        'high'
      );

      const context: ValidationContext = {
        benchmarks,
        stageMappings: [
          { stageId: 'stage-1', stageName: 'Qualification', category: 'qualification' },
        ],
        currentDate,
      };

      const result = validator.validate(deal, context);

      // Should fall back to overall median
      expect(result).not.toBeNull();
      expect(result?.dataPoints.medianCycleDays).toBeDefined();
    });

    it('should handle single-day remaining scenarios', () => {
      const deal = createDeal({
        stageCategory: 'closing',
        closeDateDaysFromNow: 1,
      });

      const context = createContext({
        medianCycleDays: 60,
        stageCategory: 'closing',
        stageDistribution: [
          { category: 'qualification', medianPercentOfCycle: 25 },
          { category: 'evaluation', medianPercentOfCycle: 30 },
          { category: 'proposal', medianPercentOfCycle: 25 },
          { category: 'closing', medianPercentOfCycle: 20 },
        ],
      });

      // At closing, 80% complete, 20% remains = 12 days expected
      // 1 actual / 12 expected = 0.08 → error

      const result = validator.validate(deal, context);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe('error');
      expect(result?.description).toContain('1 day');
    });
  });
});

// Helper functions

interface DealOptions {
  amount?: number;
  stageCategory?: StageCategory;
  closeDateDaysFromNow?: number;
  isClosed?: boolean;
  isWon?: boolean;
}

function createDeal(options: DealOptions = {}): Deal {
  const {
    amount = 3000000,
    stageCategory = 'qualification',
    closeDateDaysFromNow = 60,
    isClosed = false,
    isWon = false,
  } = options;

  const currentDate = new Date('2025-01-01T00:00:00Z');
  const closeDate = new Date(currentDate);
  closeDate.setDate(closeDate.getDate() + closeDateDaysFromNow);

  const stageName = stageCategory.charAt(0).toUpperCase() + stageCategory.slice(1).replace('_', ' ');

  const stage: DealStage = {
    id: `stage-${stageCategory}`,
    name: stageName,
    displayOrder: 0,
    probability: 50,
    isClosed,
    isWon,
  };

  return {
    id: `deal-${Math.random()}`,
    externalId: 'ext-deal-1',
    name: 'Test Deal',
    stage,
    stageId: stage.id,
    amount,
    currency: 'USD',
    closeDate,
    createdAt: new Date('2024-10-01T00:00:00Z'),
    lastModifiedAt: new Date('2024-12-15T00:00:00Z'),
    ownerId: 'owner-1',
    ownerName: 'Test Owner',
    pipelineId: 'pipeline-1',
    contacts: [],
    activities: [],
    stageHistory: [],
  };
}

interface ContextOptions {
  medianCycleDays?: number;
  stageCategory?: StageCategory;
  confidence?: ConfidenceLevel;
  stageDistribution?: Array<{
    category: StageCategory;
    medianPercentOfCycle: number;
  }>;
}

function createContext(options: ContextOptions = {}): ValidationContext {
  const {
    medianCycleDays = 75,
    stageCategory = 'qualification',
    confidence = 'high',
    stageDistribution = [
      { category: 'qualification' as StageCategory, medianPercentOfCycle: 25 },
      { category: 'evaluation' as StageCategory, medianPercentOfCycle: 30 },
      { category: 'proposal' as StageCategory, medianPercentOfCycle: 25 },
      { category: 'closing' as StageCategory, medianPercentOfCycle: 20 },
    ],
  } = options;

  const benchmarks: BenchmarkMetadata = {
    closedWonDealsAnalyzed: 50,
    medianCycleLength: medianCycleDays,
    cycleLengthBySegment: [
      { minAmount: 0, maxAmount: Infinity, medianCycleDays, dealCount: 50 },
    ],
    stageDistribution: stageDistribution.map(s => ({
      stageId: `stage-${s.category}`,
      stageName: s.category,
      category: s.category,
      medianDaysInStage: Math.round((medianCycleDays * s.medianPercentOfCycle) / 100),
      medianPercentOfCycle: s.medianPercentOfCycle,
    })),
    contactCountBySegment: [
      { minAmount: 0, maxAmount: Infinity, medianContacts: 3, p25Contacts: 2, dealCount: 50 },
    ],
    confidence,
    message: null,
  };

  const stageMappings: StageMapping[] = [
    {
      stageId: `stage-${stageCategory}`,
      stageName: stageCategory.charAt(0).toUpperCase() + stageCategory.slice(1),
      category: stageCategory,
    },
  ];

  return {
    benchmarks,
    stageMappings,
    currentDate: new Date('2025-01-01T00:00:00Z'),
  };
}

function createBenchmarksWithSegments(
  segments: Array<{
    minAmount: number;
    maxAmount: number;
    medianCycleDays: number;
    dealCount: number;
  }>,
  confidence: ConfidenceLevel = 'high'
): BenchmarkMetadata {
  return {
    closedWonDealsAnalyzed: segments.reduce((sum, s) => sum + s.dealCount, 0),
    medianCycleLength: segments[0]?.medianCycleDays || 75,
    cycleLengthBySegment: segments,
    stageDistribution: [
      {
        stageId: 'stage-qualification',
        stageName: 'Qualification',
        category: 'qualification',
        medianDaysInStage: 20,
        medianPercentOfCycle: 25,
      },
      {
        stageId: 'stage-evaluation',
        stageName: 'Evaluation',
        category: 'evaluation',
        medianDaysInStage: 24,
        medianPercentOfCycle: 30,
      },
      {
        stageId: 'stage-proposal',
        stageName: 'Proposal',
        category: 'proposal',
        medianDaysInStage: 20,
        medianPercentOfCycle: 25,
      },
      {
        stageId: 'stage-closing',
        stageName: 'Closing',
        category: 'closing',
        medianDaysInStage: 16,
        medianPercentOfCycle: 20,
      },
    ],
    contactCountBySegment: [
      { minAmount: 0, maxAmount: Infinity, medianContacts: 3, p25Contacts: 2, dealCount: 50 },
    ],
    confidence,
    message: confidence === 'low' ? 'Using industry benchmarks' : null,
  };
}
