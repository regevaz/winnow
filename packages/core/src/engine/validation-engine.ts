import {
  Deal,
  PipelineIntegrityReport,
  DealValidationResult,
  ValidationResult,
} from '../types';
import { Validator, ValidationContext } from './validator.interface';

/**
 * ValidationEngine runs all validators against open deals and produces a PipelineIntegrityReport.
 * Filters to open deals only, runs each validator per deal, aggregates results, and sorts
 * deal results by status (errors first, then warnings, then healthy).
 */
export class ValidationEngine {
  constructor(private readonly validators: Validator[]) {}

  validate(deals: Deal[], context: ValidationContext): PipelineIntegrityReport {
    const openDeals = deals.filter((d) => !d.stage.isClosed);
    const pipelineId = openDeals.length > 0 ? openDeals[0].pipelineId : '';

    const dealResults: DealValidationResult[] = openDeals.map((deal) =>
      this.validateDeal(deal, context)
    );

    const sorted = this.sortByStatus(dealResults);
    const summary = this.computeSummary(sorted);

    return {
      generatedAt: context.currentDate,
      pipelineId,
      totalDeals: sorted.length,
      summary,
      dealResults: sorted,
      benchmarkMetadata: context.benchmarks,
    };
  }

  private validateDeal(deal: Deal, context: ValidationContext): DealValidationResult {
    const validations: ValidationResult[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(deal, context);
      if (result !== null) {
        validations.push(result);
      }
    }

    const status = this.dealStatus(validations);
    return { deal, validations, status };
  }

  private dealStatus(validations: ValidationResult[]): 'error' | 'warning' | 'healthy' {
    if (validations.some((v) => v.severity === 'error')) {
      return 'error';
    }
    if (validations.some((v) => v.severity === 'warning')) {
      return 'warning';
    }
    return 'healthy';
  }

  private sortByStatus(
    results: DealValidationResult[]
  ): DealValidationResult[] {
    const order: Record<'error' | 'warning' | 'healthy', number> = {
      error: 0,
      warning: 1,
      healthy: 2,
    };
    return [...results].sort(
      (a, b) => order[a.status] - order[b.status]
    );
  }

  private computeSummary(
    results: DealValidationResult[]
  ): { errors: number; warnings: number; healthy: number } {
    let errors = 0;
    let warnings = 0;
    let healthy = 0;
    for (const r of results) {
      if (r.status === 'error') errors++;
      else if (r.status === 'warning') warnings++;
      else healthy++;
    }
    return { errors, warnings, healthy };
  }
}
