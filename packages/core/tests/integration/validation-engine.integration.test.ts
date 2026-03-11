import {
  Deal,
  DealStage,
  DealContact,
  DealActivity,
  StageChange,
  ClosedDealRecord,
  StageMapping,
} from '../../src/types';
import { BenchmarkService, DEFAULT_BENCHMARK_CONFIG } from '../../src/engine/benchmark.service';
import { ValidationEngine } from '../../src/engine/validation-engine';
import { ValidationContext } from '../../src/engine/validator.interface';
import { UnrealisticCloseDateValidator } from '../../src/validators/unrealistic-close-date.validator';
import { MissingBuyingCommitteeValidator } from '../../src/validators/missing-buying-committee.validator';
import { StageActivityMismatchValidator } from '../../src/validators/stage-activity-mismatch.validator';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const PIPELINE_ID = 'pipeline-integration-test';

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

/** Build closed-won records for benchmark computation (25+ so we get historical benchmarks) */
function buildClosedRecords(currentDate: Date): ClosedDealRecord[] {
  const records: ClosedDealRecord[] = [];
  for (let i = 0; i < 25; i++) {
    const closedAt = addDays(currentDate, -30 - i * 10);
    const cycleLengthDays = 60 + (i % 40);
    const amount = 2000000 + i * 500000; // $20k–$120k range
    const contactCount = Math.min(5, Math.max(2, Math.floor(i / 5)));
    records.push({
      id: `closed-${i}`,
      amount,
      cycleLengthDays,
      contactCount,
      stageTimeline: [
        { stageId: 'qual', stageName: 'Qualification', daysInStage: 15, percentOfCycle: 25 },
        { stageId: 'eval', stageName: 'Evaluation', daysInStage: 18, percentOfCycle: 30 },
        { stageId: 'prop', stageName: 'Proposal', daysInStage: 15, percentOfCycle: 25 },
        { stageId: 'close', stageName: 'Closing', daysInStage: 12, percentOfCycle: 20 },
      ],
      closedAt,
    });
  }
  return records;
}

/** Build stage mappings for validation */
function buildStageMappings(): StageMapping[] {
  return [
    { stageId: 'qual', stageName: 'Qualification', category: 'qualification' },
    { stageId: 'eval', stageName: 'Evaluation', category: 'evaluation' },
    { stageId: 'prop', stageName: 'Proposal', category: 'proposal' },
    { stageId: 'close', stageName: 'Closing', category: 'closing' },
  ];
}

/** Create an open deal with configurable fields for integration tests */
function createOpenDeal(
  id: string,
  currentDate: Date,
  options: {
    stageId?: string;
    stageName?: string;
    stageCategory?: 'qualification' | 'evaluation' | 'proposal' | 'closing';
    closeDateDaysFromNow?: number;
    contactCount?: number;
    daysSinceLastActivity?: number;
    createdAtDaysAgo?: number;
    amount?: number;
  } = {}
): Deal {
  const {
    stageId = 'eval',
    stageName = 'Evaluation',
    stageCategory = 'evaluation',
    closeDateDaysFromNow = 45,
    contactCount = 3,
    daysSinceLastActivity = 2,
    createdAtDaysAgo = 60,
    amount = 5000000,
  } = options;

  const createdAt = addDays(currentDate, -createdAtDaysAgo);
  const closeDate = addDays(currentDate, closeDateDaysFromNow);
  const lastActivity = addDays(currentDate, -daysSinceLastActivity);

  const stage: DealStage = {
    id: stageId,
    name: stageName,
    displayOrder: 2,
    probability: 50,
    isClosed: false,
    isWon: false,
  };

  const contacts: DealContact[] = Array.from({ length: contactCount }, (_, i) => ({
    id: `c-${id}-${i}`,
    externalId: `ext-c-${i}`,
    email: `contact${i}@example.com`,
    firstName: `First${i}`,
    lastName: `Last${i}`,
    title: i === 0 ? 'VP Sales' : 'Manager',
    seniorityLevel: i === 0 ? 'vp' : 'manager',
    role: null,
    addedAt: createdAt,
  }));

  const activities: DealActivity[] = [
    { id: `a-${id}`, type: 'stage_change', timestamp: lastActivity, description: null },
  ];

  const stageHistory: StageChange[] = [
    { fromStage: 'qual', toStage: stageId, changedAt: addDays(createdAt, 20) },
  ];

  return {
    id,
    externalId: `ext-${id}`,
    name: `Deal ${id}`,
    stage,
    stageId,
    amount,
    currency: 'USD',
    closeDate,
    createdAt,
    lastModifiedAt: lastActivity,
    ownerId: 'owner-1',
    ownerName: 'Owner',
    pipelineId: PIPELINE_ID,
    contacts,
    activities,
    stageHistory,
  };
}

describe('ValidationEngine integration', () => {
  it('produces report with expected structure when run with all validators', () => {
    const currentDate = new Date();
    const closedRecords = buildClosedRecords(currentDate);
    const benchmarks = BenchmarkService.computeBenchmarks(
      closedRecords,
      DEFAULT_BENCHMARK_CONFIG
    );
    const stageMappings = buildStageMappings();
    const context: ValidationContext = {
      benchmarks,
      stageMappings,
      currentDate,
    };

    const deals: Deal[] = [
      createOpenDeal('d1', currentDate),
      createOpenDeal('d2', currentDate, { closeDateDaysFromNow: 60 }),
    ];

    const engine = new ValidationEngine([
      new UnrealisticCloseDateValidator(),
      new MissingBuyingCommitteeValidator(),
      new StageActivityMismatchValidator(),
    ]);
    const report = engine.validate(deals, context);

    expect(report.generatedAt).toBe(currentDate);
    expect(report.pipelineId).toBe(PIPELINE_ID);
    expect(report.totalDeals).toBe(2);
    expect(
      report.summary.errors + report.summary.warnings + report.summary.healthy
    ).toBe(report.totalDeals);
    expect(report.dealResults).toHaveLength(2);
    expect(report.benchmarkMetadata).toBe(benchmarks);
  });

  it('flags some deals as error or warning and some as healthy', () => {
    const currentDate = new Date();
    const closedRecords = buildClosedRecords(currentDate);
    const benchmarks = BenchmarkService.computeBenchmarks(
      closedRecords,
      DEFAULT_BENCHMARK_CONFIG
    );
    const stageMappings = buildStageMappings();
    const context: ValidationContext = {
      benchmarks,
      stageMappings,
      currentDate,
    };

    const deals: Deal[] = [
      createOpenDeal('unrealistic', currentDate, {
        closeDateDaysFromNow: 5,
        stageCategory: 'qualification',
        stageId: 'qual',
        stageName: 'Qualification',
      }),
      createOpenDeal('thin', currentDate, {
        contactCount: 1,
        stageCategory: 'proposal',
        stageId: 'prop',
        stageName: 'Proposal',
        amount: 8000000,
      }),
      createOpenDeal('stale', currentDate, {
        daysSinceLastActivity: 20,
        stageCategory: 'proposal',
        stageId: 'prop',
        stageName: 'Proposal',
      }),
      createOpenDeal('healthy', currentDate, {
        closeDateDaysFromNow: 50,
        contactCount: 4,
        daysSinceLastActivity: 3,
      }),
    ];

    const engine = new ValidationEngine([
      new UnrealisticCloseDateValidator(),
      new MissingBuyingCommitteeValidator(),
      new StageActivityMismatchValidator(),
    ]);
    const report = engine.validate(deals, context);

    expect(report.totalDeals).toBe(4);
    const hasError = report.summary.errors > 0;
    const hasWarning = report.summary.warnings > 0;
    const hasHealthy = report.summary.healthy > 0;
    expect(hasError || hasWarning).toBe(true);
    expect(hasHealthy).toBe(true);
  });

  it('sorts deal results with errors first, then warnings, then healthy', () => {
    const currentDate = new Date();
    const closedRecords = buildClosedRecords(currentDate);
    const benchmarks = BenchmarkService.computeBenchmarks(
      closedRecords,
      DEFAULT_BENCHMARK_CONFIG
    );
    const stageMappings = buildStageMappings();
    const context: ValidationContext = {
      benchmarks,
      stageMappings,
      currentDate,
    };

    const deals: Deal[] = [
      createOpenDeal('h', currentDate, { closeDateDaysFromNow: 60 }),
      createOpenDeal('e', currentDate, { closeDateDaysFromNow: 3, stageId: 'qual', stageName: 'Qualification' }),
      createOpenDeal('w', currentDate, { contactCount: 1, stageId: 'prop', stageName: 'Proposal', amount: 6000000 }),
    ];

    const engine = new ValidationEngine([
      new UnrealisticCloseDateValidator(),
      new MissingBuyingCommitteeValidator(),
      new StageActivityMismatchValidator(),
    ]);
    const report = engine.validate(deals, context);

    const order = report.dealResults.map((r) => r.status);
    const errorIndices = report.dealResults
      .map((r, i) => (r.status === 'error' ? i : -1))
      .filter((i) => i >= 0);
    const warningIndices = report.dealResults
      .map((r, i) => (r.status === 'warning' ? i : -1))
      .filter((i) => i >= 0);
    const healthyIndices = report.dealResults
      .map((r, i) => (r.status === 'healthy' ? i : -1))
      .filter((i) => i >= 0);
    const maxError = errorIndices.length > 0 ? Math.max(...errorIndices) : -1;
    const minWarning = warningIndices.length > 0 ? Math.min(...warningIndices) : Infinity;
    const minHealthy = healthyIndices.length > 0 ? Math.min(...healthyIndices) : Infinity;
    if (maxError >= 0 && minWarning < Infinity) {
      expect(maxError).toBeLessThan(minWarning);
    }
    if (warningIndices.length > 0 && healthyIndices.length > 0) {
      expect(Math.max(...warningIndices)).toBeLessThan(minHealthy);
    }
  });
});
