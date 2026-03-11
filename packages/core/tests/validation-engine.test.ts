import { ValidationEngine } from '../src/engine/validation-engine';
import {
  Deal,
  DealStage,
  Validator,
  ValidationContext,
  ValidationResult,
  ValidatorId,
} from '../src/types';
import { BenchmarkMetadata, StageMapping } from '../src/types';

describe('ValidationEngine', () => {
  const currentDate = new Date('2025-01-15T12:00:00Z');
  const pipelineId = 'pipeline-123';

  function createOpenDeal(id: string, pipeline?: string): Deal {
    const stage: DealStage = {
      id: 'stage-1',
      name: 'Evaluation',
      displayOrder: 1,
      probability: 50,
      isClosed: false,
      isWon: false,
    };
    return {
      id,
      externalId: `ext-${id}`,
      name: `Deal ${id}`,
      stage,
      stageId: stage.id,
      amount: 5000000,
      currency: 'USD',
      closeDate: new Date('2025-03-01'),
      createdAt: new Date('2024-06-01'),
      lastModifiedAt: new Date('2024-12-01'),
      ownerId: 'owner-1',
      ownerName: 'Owner',
      pipelineId: pipeline ?? pipelineId,
      contacts: [],
      activities: [],
      stageHistory: [],
    };
  }

  function createClosedDeal(id: string): Deal {
    const deal = createOpenDeal(id);
    deal.stage = {
      id: 'stage-won',
      name: 'Closed Won',
      displayOrder: 10,
      probability: 100,
      isClosed: true,
      isWon: true,
    };
    deal.stageId = deal.stage.id;
    return deal;
  }

  function createContext(): ValidationContext {
    const benchmarks: BenchmarkMetadata = {
      closedWonDealsAnalyzed: 30,
      medianCycleLength: 75,
      cycleLengthBySegment: [],
      stageDistribution: [],
      contactCountBySegment: [],
      confidence: 'high',
      message: null,
    };
    const stageMappings: StageMapping[] = [
      { stageId: 'stage-1', stageName: 'Evaluation', category: 'evaluation' },
    ];
    return { benchmarks, stageMappings, currentDate };
  }

  function createMockValidator(
    id: ValidatorId,
    result: ValidationResult | null
  ): Validator {
    return {
      id,
      name: `Mock ${id}`,
      description: 'Mock',
      validate: () => result,
    };
  }

  function createConditionalMockValidator(
    id: ValidatorId,
    fn: (deal: Deal) => ValidationResult | null
  ): Validator {
    return {
      id,
      name: `Mock ${id}`,
      description: 'Mock',
      validate: fn,
    };
  }

  it('filters to open deals only and excludes closed deals', () => {
    const alwaysError = createMockValidator('unrealistic_close_date', {
      validatorId: 'unrealistic_close_date',
      dealId: 'any',
      severity: 'error',
      title: 'Error',
      description: 'Error',
      dataPoints: {},
      confidence: 'high',
    });
    const engine = new ValidationEngine([alwaysError]);
    const deals: Deal[] = [
      createOpenDeal('open-1'),
      createClosedDeal('closed-1'),
      createOpenDeal('open-2'),
    ];
    const report = engine.validate(deals, createContext());
    expect(report.totalDeals).toBe(2);
    expect(report.dealResults.map((r) => r.deal.id)).toEqual(['open-1', 'open-2']);
    expect(report.summary.errors).toBe(2);
  });

  it('runs every validator against every open deal', () => {
    const calledDealIds: string[] = [];
    const validator = createConditionalMockValidator('unrealistic_close_date', (deal) => {
      calledDealIds.push(deal.id);
      return null;
    });
    const engine = new ValidationEngine([validator]);
    const deals = [createOpenDeal('a'), createOpenDeal('b'), createOpenDeal('c')];
    engine.validate(deals, createContext());
    expect(calledDealIds).toEqual(['a', 'b', 'c']);
  });

  it('calls all validators for each deal', () => {
    const callCount = { count: 0 };
    const v1 = createConditionalMockValidator('unrealistic_close_date', () => {
      callCount.count++;
      return null;
    });
    const v2 = createConditionalMockValidator('missing_buying_committee', () => {
      callCount.count++;
      return null;
    });
    const engine = new ValidationEngine([v1, v2]);
    const deals = [createOpenDeal('a'), createOpenDeal('b')];
    engine.validate(deals, createContext());
    expect(callCount.count).toBe(4);
  });

  it('computes deal status as error when any validation has severity error', () => {
    const v = createConditionalMockValidator('unrealistic_close_date', (deal) =>
      deal.id === 'err' ? { validatorId: 'unrealistic_close_date', dealId: deal.id, severity: 'error', title: 'E', description: 'E', dataPoints: {}, confidence: 'high' } : null
    );
    const engine = new ValidationEngine([v]);
    const deals = [createOpenDeal('err'), createOpenDeal('ok')];
    const report = engine.validate(deals, createContext());
    const errResult = report.dealResults.find((r) => r.deal.id === 'err');
    const okResult = report.dealResults.find((r) => r.deal.id === 'ok');
    expect(errResult?.status).toBe('error');
    expect(okResult?.status).toBe('healthy');
  });

  it('computes deal status as warning when highest severity is warning', () => {
    const v = createConditionalMockValidator('missing_buying_committee', (deal) =>
      deal.id === 'warn' ? { validatorId: 'missing_buying_committee', dealId: deal.id, severity: 'warning', title: 'W', description: 'W', dataPoints: {}, confidence: 'high' } : null
    );
    const engine = new ValidationEngine([v]);
    const deals = [createOpenDeal('warn')];
    const report = engine.validate(deals, createContext());
    expect(report.dealResults[0].status).toBe('warning');
  });

  it('computes deal status as healthy when no validations return', () => {
    const v = createMockValidator('unrealistic_close_date', null);
    const engine = new ValidationEngine([v]);
    const deals = [createOpenDeal('healthy')];
    const report = engine.validate(deals, createContext());
    expect(report.dealResults[0].status).toBe('healthy');
    expect(report.dealResults[0].validations).toHaveLength(0);
  });

  it('sorts deal results: errors first, then warnings, then healthy', () => {
    const v = createConditionalMockValidator('unrealistic_close_date', (deal) => {
      if (deal.id === 'e') return { validatorId: 'unrealistic_close_date', dealId: deal.id, severity: 'error', title: 'E', description: 'E', dataPoints: {}, confidence: 'high' };
      if (deal.id === 'w') return { validatorId: 'unrealistic_close_date', dealId: deal.id, severity: 'warning', title: 'W', description: 'W', dataPoints: {}, confidence: 'high' };
      return null;
    });
    const engine = new ValidationEngine([v]);
    const deals = [
      createOpenDeal('h'),
      createOpenDeal('e'),
      createOpenDeal('w'),
    ];
    const report = engine.validate(deals, createContext());
    const order = report.dealResults.map((r) => r.deal.id);
    expect(order).toEqual(['e', 'w', 'h']);
  });

  it('computes summary counts correctly', () => {
    const v = createConditionalMockValidator('unrealistic_close_date', (deal) => {
      if (deal.id === 'e1' || deal.id === 'e2') return { validatorId: 'unrealistic_close_date', dealId: deal.id, severity: 'error', title: 'E', description: 'E', dataPoints: {}, confidence: 'high' };
      if (deal.id === 'w1') return { validatorId: 'unrealistic_close_date', dealId: deal.id, severity: 'warning', title: 'W', description: 'W', dataPoints: {}, confidence: 'high' };
      return null;
    });
    const engine = new ValidationEngine([v]);
    const deals = [
      createOpenDeal('e1'),
      createOpenDeal('e2'),
      createOpenDeal('w1'),
      createOpenDeal('h1'),
      createOpenDeal('h2'),
    ];
    const report = engine.validate(deals, createContext());
    expect(report.summary).toEqual({ errors: 2, warnings: 1, healthy: 2 });
    expect(report.totalDeals).toBe(5);
  });

  it('uses pipelineId from deals and generatedAt from context', () => {
    const engine = new ValidationEngine([]);
    const ctx = createContext();
    const deals = [createOpenDeal('a', 'my-pipeline-id')];
    const report = engine.validate(deals, ctx);
    expect(report.pipelineId).toBe('my-pipeline-id');
    expect(report.generatedAt).toBe(currentDate);
    expect(report.benchmarkMetadata).toBe(ctx.benchmarks);
  });

  it('handles empty deal list', () => {
    const engine = new ValidationEngine([createMockValidator('unrealistic_close_date', null)]);
    const report = engine.validate([], createContext());
    expect(report.totalDeals).toBe(0);
    expect(report.pipelineId).toBe('');
    expect(report.summary).toEqual({ errors: 0, warnings: 0, healthy: 0 });
    expect(report.dealResults).toHaveLength(0);
  });

  it('aggregates multiple validations per deal and uses highest severity for status', () => {
    const v1 = createConditionalMockValidator('unrealistic_close_date', (deal) =>
      deal.id === 'multi' ? { validatorId: 'unrealistic_close_date', dealId: deal.id, severity: 'warning', title: 'W', description: 'W', dataPoints: {}, confidence: 'high' } : null
    );
    const v2 = createConditionalMockValidator('missing_buying_committee', (deal) =>
      deal.id === 'multi' ? { validatorId: 'missing_buying_committee', dealId: deal.id, severity: 'error', title: 'E', description: 'E', dataPoints: {}, confidence: 'high' } : null
    );
    const engine = new ValidationEngine([v1, v2]);
    const deals = [createOpenDeal('multi')];
    const report = engine.validate(deals, createContext());
    const result = report.dealResults[0];
    expect(result.status).toBe('error');
    expect(result.validations).toHaveLength(2);
  });
});
