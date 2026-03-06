export interface ClosedDealRecord {
  id: string;
  amount: number;
  cycleLengthDays: number;           // Created to closed-won
  contactCount: number;
  stageTimeline: {
    stageId: string;
    stageName: string;
    daysInStage: number;
    percentOfCycle: number;
  }[];
  closedAt: Date;
}

export interface BenchmarkConfig {
  // Minimum closed-won deals needed for reliable benchmarks
  minDealsForBenchmark: number;          // Default: 20
  // Lookback window for benchmark computation
  lookbackMonths: number;                // Default: 12
  // Deal size segments (in cents)
  amountSegments: { min: number; max: number; label: string }[];
}

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  minDealsForBenchmark: 20,
  lookbackMonths: 12,
  amountSegments: [
    { min: 0, max: 2000000, label: '<$20k' },              // Under $20k
    { min: 2000000, max: 5000000, label: '$20k-$50k' },
    { min: 5000000, max: 10000000, label: '$50k-$100k' },
    { min: 10000000, max: Infinity, label: '$100k+' },
  ],
};

// Fallback benchmarks when insufficient historical data
export const INDUSTRY_FALLBACK_BENCHMARKS = {
  medianCycleDays: 75,
  stageDistribution: [
    { category: 'qualification' as const, percentOfCycle: 25 },
    { category: 'evaluation' as const, percentOfCycle: 30 },
    { category: 'proposal' as const, percentOfCycle: 25 },
    { category: 'closing' as const, percentOfCycle: 20 },
  ],
  contactsByAmount: [
    { maxAmount: 2000000, minContacts: 1 },
    { maxAmount: 5000000, minContacts: 2 },
    { maxAmount: 10000000, minContacts: 3 },
    { maxAmount: Infinity, minContacts: 4 },
  ],
};
