import { BenchmarkService } from '../src/engine/benchmark.service';
import { ClosedDealRecord, DEFAULT_BENCHMARK_CONFIG, INDUSTRY_FALLBACK_BENCHMARKS } from '../src/types';

describe('BenchmarkService', () => {
  describe('computeBenchmarks - Normal computation (50+ deals)', () => {
    it('should compute benchmarks with high confidence for 50+ deals', () => {
      const closedDeals: ClosedDealRecord[] = generateMockDeals(50, {
        cycleLengthRange: { min: 30, max: 90 },
        amountRange: { min: 1000000, max: 10000000 },
        contactRange: { min: 2, max: 5 },
      });

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.closedWonDealsAnalyzed).toBe(50);
      expect(result.confidence).toBe('high');
      expect(result.message).toBeNull();
      expect(result.medianCycleLength).toBeGreaterThan(0);
      expect(result.cycleLengthBySegment).toHaveLength(DEFAULT_BENCHMARK_CONFIG.amountSegments.length);
      expect(result.stageDistribution.length).toBeGreaterThan(0);
      expect(result.contactCountBySegment).toHaveLength(DEFAULT_BENCHMARK_CONFIG.amountSegments.length);
    });

    it('should compute correct median cycle length', () => {
      const closedDeals: ClosedDealRecord[] = [
        createDeal({ cycleLengthDays: 30 }),
        createDeal({ cycleLengthDays: 40 }),
        createDeal({ cycleLengthDays: 50 }),
        createDeal({ cycleLengthDays: 60 }),
        createDeal({ cycleLengthDays: 70 }),
      ];
      // Add more deals to reach minimum
      for (let i = 0; i < 45; i++) {
        closedDeals.push(createDeal({ cycleLengthDays: 50 }));
      }

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.medianCycleLength).toBe(50);
    });

    it('should segment deals by amount correctly', () => {
      const closedDeals: ClosedDealRecord[] = [
        ...Array(15).fill(0).map(() => createDeal({ amount: 1000000, cycleLengthDays: 30 })), // <$20k
        ...Array(15).fill(0).map(() => createDeal({ amount: 3000000, cycleLengthDays: 45 })), // $20k-$50k
        ...Array(10).fill(0).map(() => createDeal({ amount: 7000000, cycleLengthDays: 60 })), // $50k-$100k
        ...Array(10).fill(0).map(() => createDeal({ amount: 15000000, cycleLengthDays: 90 })), // $100k+
      ];

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.cycleLengthBySegment[0].dealCount).toBe(15);
      expect(result.cycleLengthBySegment[0].medianCycleDays).toBe(30);
      expect(result.cycleLengthBySegment[1].dealCount).toBe(15);
      expect(result.cycleLengthBySegment[1].medianCycleDays).toBe(45);
      expect(result.cycleLengthBySegment[2].dealCount).toBe(10);
      expect(result.cycleLengthBySegment[2].medianCycleDays).toBe(60);
      expect(result.cycleLengthBySegment[3].dealCount).toBe(10);
      expect(result.cycleLengthBySegment[3].medianCycleDays).toBe(90);
    });

    it('should compute stage distribution correctly', () => {
      const closedDeals: ClosedDealRecord[] = [];
      for (let i = 0; i < 50; i++) {
        closedDeals.push(createDeal({
          stageTimeline: [
            { stageId: 'stage1', stageName: 'Qualification', daysInStage: 10, percentOfCycle: 20 },
            { stageId: 'stage2', stageName: 'Proposal', daysInStage: 20, percentOfCycle: 40 },
            { stageId: 'stage3', stageName: 'Negotiation', daysInStage: 20, percentOfCycle: 40 },
          ],
        }));
      }

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.stageDistribution).toHaveLength(3);

      const qualification = result.stageDistribution.find(s => s.stageName === 'Qualification');
      expect(qualification?.medianDaysInStage).toBe(10);
      expect(qualification?.medianPercentOfCycle).toBe(20);

      const proposal = result.stageDistribution.find(s => s.stageName === 'Proposal');
      expect(proposal?.medianDaysInStage).toBe(20);
      expect(proposal?.medianPercentOfCycle).toBe(40);
    });

    it('should compute contact count percentiles by segment', () => {
      const closedDeals: ClosedDealRecord[] = [
        ...Array(25).fill(0).map(() => createDeal({ amount: 1000000, contactCount: 2 })), // <$20k
        ...Array(25).fill(0).map(() => createDeal({ amount: 3000000, contactCount: 4 })), // $20k-$50k
      ];

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.contactCountBySegment[0].medianContacts).toBe(2);
      expect(result.contactCountBySegment[0].dealCount).toBe(25);
      expect(result.contactCountBySegment[1].medianContacts).toBe(4);
      expect(result.contactCountBySegment[1].dealCount).toBe(25);
    });

    it('should respect lookback window configuration', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 18); // 18 months ago

      const closedDeals: ClosedDealRecord[] = [
        ...Array(30).fill(0).map(() => createDeal({ closedAt: new Date() })), // Recent
        ...Array(20).fill(0).map(() => createDeal({ closedAt: oldDate })), // Old
      ];

      const result = BenchmarkService.computeBenchmarks(closedDeals, {
        ...DEFAULT_BENCHMARK_CONFIG,
        lookbackMonths: 12,
      });

      // Should only use the 30 recent deals (within 12 months)
      // All segments should have some deals
      const totalDealsInSegments = result.cycleLengthBySegment.reduce((sum, seg) => sum + seg.dealCount, 0);
      expect(totalDealsInSegments).toBeLessThanOrEqual(30);
    });
  });

  describe('computeBenchmarks - Medium confidence (20-49 deals)', () => {
    it('should compute benchmarks with medium confidence for 20-49 deals', () => {
      const closedDeals: ClosedDealRecord[] = generateMockDeals(30);

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.closedWonDealsAnalyzed).toBe(30);
      expect(result.confidence).toBe('medium');
      expect(result.message).toContain('Based on 30 deals');
      expect(result.message).toContain('50+ deals recommended');
    });

    it('should compute benchmarks at boundary (20 deals)', () => {
      const closedDeals: ClosedDealRecord[] = generateMockDeals(20);

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.closedWonDealsAnalyzed).toBe(20);
      expect(result.confidence).toBe('medium');
      expect(result.message).not.toBeNull();
    });
  });

  describe('computeBenchmarks - Low data scenario (< 20 deals)', () => {
    it('should use fallback benchmarks when deal count is below minimum', () => {
      const closedDeals: ClosedDealRecord[] = generateMockDeals(5);

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.closedWonDealsAnalyzed).toBe(5);
      expect(result.confidence).toBe('low');
      expect(result.message).toContain('Based on only 5 deals');
      expect(result.message).toContain('Using industry benchmarks');
      expect(result.medianCycleLength).toBe(INDUSTRY_FALLBACK_BENCHMARKS.medianCycleDays);
    });

    it('should use fallback benchmarks for zero deals', () => {
      const closedDeals: ClosedDealRecord[] = [];

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.closedWonDealsAnalyzed).toBe(0);
      expect(result.confidence).toBe('low');
      expect(result.message).toBe('No historical data available. Using industry benchmarks.');
      expect(result.medianCycleLength).toBe(INDUSTRY_FALLBACK_BENCHMARKS.medianCycleDays);
    });

    it('should provide fallback values for all segments when insufficient data', () => {
      const closedDeals: ClosedDealRecord[] = generateMockDeals(3);

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.cycleLengthBySegment).toHaveLength(DEFAULT_BENCHMARK_CONFIG.amountSegments.length);
      expect(result.contactCountBySegment).toHaveLength(DEFAULT_BENCHMARK_CONFIG.amountSegments.length);
      expect(result.stageDistribution.length).toBeGreaterThan(0);
    });
  });

  describe('computeBenchmarks - Edge cases', () => {
    it('should handle all deals with same amount (single segment)', () => {
      const closedDeals: ClosedDealRecord[] = [];
      for (let i = 0; i < 50; i++) {
        closedDeals.push(createDeal({
          amount: 3000000, // All in $20k-$50k segment
          cycleLengthDays: 30 + i,
        }));
      }

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.cycleLengthBySegment[1].dealCount).toBe(50);
      expect(result.cycleLengthBySegment[0].dealCount).toBe(0);
      expect(result.cycleLengthBySegment[2].dealCount).toBe(0);
      expect(result.cycleLengthBySegment[3].dealCount).toBe(0);

      // Empty segments should have fallback values
      expect(result.cycleLengthBySegment[0].medianCycleDays).toBe(INDUSTRY_FALLBACK_BENCHMARKS.medianCycleDays);
    });

    it('should handle single stage timeline', () => {
      const closedDeals: ClosedDealRecord[] = [];
      for (let i = 0; i < 50; i++) {
        closedDeals.push(createDeal({
          stageTimeline: [
            { stageId: 'only-stage', stageName: 'Single Stage', daysInStage: 45, percentOfCycle: 100 },
          ],
        }));
      }

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.stageDistribution).toHaveLength(1);
      expect(result.stageDistribution[0].stageName).toBe('Single Stage');
      expect(result.stageDistribution[0].medianPercentOfCycle).toBe(100);
    });

    it('should handle deals with zero contacts', () => {
      const closedDeals: ClosedDealRecord[] = [];
      for (let i = 0; i < 50; i++) {
        closedDeals.push(createDeal({ amount: 1000000, contactCount: 0 })); // In segment 0
      }

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.contactCountBySegment[0].medianContacts).toBe(0);
      expect(result.contactCountBySegment[0].p25Contacts).toBe(0);
    });

    it('should handle very short cycle times', () => {
      const closedDeals: ClosedDealRecord[] = [];
      for (let i = 0; i < 50; i++) {
        closedDeals.push(createDeal({ cycleLengthDays: 1 }));
      }

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.medianCycleLength).toBe(1);
    });

    it('should handle very long cycle times', () => {
      const closedDeals: ClosedDealRecord[] = [];
      for (let i = 0; i < 50; i++) {
        closedDeals.push(createDeal({ cycleLengthDays: 365 }));
      }

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.medianCycleLength).toBe(365);
    });

    it('should handle deals at segment boundaries', () => {
      const closedDeals: ClosedDealRecord[] = [
        ...Array(15).fill(0).map(() => createDeal({ amount: 0 })), // Exactly at min
        ...Array(15).fill(0).map(() => createDeal({ amount: 2000000 })), // Exactly at boundary
        ...Array(20).fill(0).map(() => createDeal({ amount: 5000000 })), // Exactly at next boundary
      ];

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      // Verify deals are placed in correct segments
      // amount >= min && amount < max
      const totalDeals = result.cycleLengthBySegment.reduce((sum, seg) => sum + seg.dealCount, 0);
      expect(totalDeals).toBe(50);
    });

    it('should handle missing stage timeline data', () => {
      const closedDeals: ClosedDealRecord[] = [];
      for (let i = 0; i < 50; i++) {
        closedDeals.push(createDeal({ stageTimeline: [] }));
      }

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.stageDistribution).toHaveLength(0);
    });

    it('should handle varied stage timelines across deals', () => {
      const closedDeals: ClosedDealRecord[] = [
        ...Array(25).fill(0).map(() => createDeal({
          stageTimeline: [
            { stageId: 's1', stageName: 'Stage 1', daysInStage: 10, percentOfCycle: 50 },
            { stageId: 's2', stageName: 'Stage 2', daysInStage: 10, percentOfCycle: 50 },
          ],
        })),
        ...Array(25).fill(0).map(() => createDeal({
          stageTimeline: [
            { stageId: 's1', stageName: 'Stage 1', daysInStage: 15, percentOfCycle: 75 },
            { stageId: 's3', stageName: 'Stage 3', daysInStage: 5, percentOfCycle: 25 },
          ],
        })),
      ];

      const result = BenchmarkService.computeBenchmarks(closedDeals);

      expect(result.stageDistribution.length).toBeGreaterThanOrEqual(2);

      const stage1 = result.stageDistribution.find(s => s.stageName === 'Stage 1');
      expect(stage1).toBeDefined();
      expect(stage1?.medianDaysInStage).toBeGreaterThanOrEqual(10);
      expect(stage1?.medianDaysInStage).toBeLessThanOrEqual(15);
    });
  });

  describe('computeBenchmarks - Custom configuration', () => {
    it('should respect custom minimum deals threshold', () => {
      const closedDeals: ClosedDealRecord[] = generateMockDeals(15);

      const result = BenchmarkService.computeBenchmarks(closedDeals, {
        ...DEFAULT_BENCHMARK_CONFIG,
        minDealsForBenchmark: 10,
      });

      // Should compute from actual deals, not use fallback
      expect(result.confidence).toBe('low'); // Still low because < 20
      expect(result.message).toContain('Based on 15 deals');
    });

    it('should respect custom amount segments', () => {
      const closedDeals: ClosedDealRecord[] = generateMockDeals(50, {
        amountRange: { min: 0, max: 2000000 },
      });

      const customSegments = [
        { min: 0, max: 500000, label: 'Small' },
        { min: 500000, max: 1000000, label: 'Medium' },
        { min: 1000000, max: Infinity, label: 'Large' },
      ];

      const result = BenchmarkService.computeBenchmarks(closedDeals, {
        ...DEFAULT_BENCHMARK_CONFIG,
        amountSegments: customSegments,
      });

      expect(result.cycleLengthBySegment).toHaveLength(3);
      expect(result.contactCountBySegment).toHaveLength(3);
    });

    it('should use all deals when recent deals are insufficient after filtering', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 18);

      const closedDeals: ClosedDealRecord[] = [
        ...Array(10).fill(0).map(() => createDeal({ closedAt: new Date() })), // Recent
        ...Array(40).fill(0).map(() => createDeal({ closedAt: oldDate, cycleLengthDays: 100 })), // Old
      ];

      const result = BenchmarkService.computeBenchmarks(closedDeals, {
        ...DEFAULT_BENCHMARK_CONFIG,
        lookbackMonths: 12,
      });

      // Should use all 50 deals since filtered set (10) is insufficient
      const totalDealsInSegments = result.cycleLengthBySegment.reduce((sum, seg) => sum + seg.dealCount, 0);
      expect(totalDealsInSegments).toBe(50);
    });
  });
});

// Helper functions

interface DealOptions {
  amount?: number;
  cycleLengthDays?: number;
  contactCount?: number;
  closedAt?: Date;
  stageTimeline?: Array<{
    stageId: string;
    stageName: string;
    daysInStage: number;
    percentOfCycle: number;
  }>;
}

function createDeal(options: DealOptions = {}): ClosedDealRecord {
  const {
    amount = 3000000,
    cycleLengthDays = 45,
    contactCount = 3,
    closedAt = new Date(),
    stageTimeline = [
      { stageId: 'qual', stageName: 'Qualification', daysInStage: 15, percentOfCycle: 33.3 },
      { stageId: 'prop', stageName: 'Proposal', daysInStage: 15, percentOfCycle: 33.3 },
      { stageId: 'neg', stageName: 'Negotiation', daysInStage: 15, percentOfCycle: 33.4 },
    ],
  } = options;

  return {
    dealId: `deal-${Math.random()}`,
    amount,
    cycleLengthDays,
    contactCount,
    closedAt,
    stageTimeline,
  };
}

interface MockOptions {
  cycleLengthRange?: { min: number; max: number };
  amountRange?: { min: number; max: number };
  contactRange?: { min: number; max: number };
}

function generateMockDeals(count: number, options: MockOptions = {}): ClosedDealRecord[] {
  const {
    cycleLengthRange = { min: 30, max: 90 },
    amountRange = { min: 1000000, max: 10000000 },
    contactRange = { min: 1, max: 5 },
  } = options;

  const deals: ClosedDealRecord[] = [];
  for (let i = 0; i < count; i++) {
    deals.push(createDeal({
      amount: randomInt(amountRange.min, amountRange.max),
      cycleLengthDays: randomInt(cycleLengthRange.min, cycleLengthRange.max),
      contactCount: randomInt(contactRange.min, contactRange.max),
    }));
  }
  return deals;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
