import {
  Deal,
  ValidationResult,
  ValidatorId,
  ConfidenceLevel,
  StageCategory,
  BenchmarkMetadata,
  StageTimeDistribution,
  CycleSegment,
} from '../types';
import { Validator, ValidationContext } from '../engine/validator.interface';

export class UnrealisticCloseDateValidator implements Validator {
  readonly id: ValidatorId = 'unrealistic_close_date';
  readonly name = 'Unrealistic Close Date';
  readonly description = 'Flags deals whose close date is inconsistent with their stage and historical cycle length';

  validate(deal: Deal, context: ValidationContext): ValidationResult | null {
    // Skip closed deals
    if (deal.stage.isClosed) {
      return null;
    }

    const { benchmarks, stageMappings, currentDate } = context;

    // Determine deal's amount segment and get median cycle days
    const medianCycleDays = this.getMedianCycleDays(deal.amount, benchmarks);

    // Determine benchmark source
    const benchmarkSource: 'historical' | 'industry_fallback' =
      benchmarks.confidence === 'low' ? 'industry_fallback' : 'historical';

    // Find deal's stage category
    const stageMapping = stageMappings.find(
      m => m.stageId === deal.stageId || m.stageName === deal.stage.name
    );
    const stageCategory = stageMapping?.category || 'qualification';

    // Calculate cumulative progress at current stage
    const cumulativeProgress = this.calculateCumulativeProgress(
      stageCategory,
      benchmarks.stageDistribution
    );

    // Calculate expected remaining days
    const expectedRemainingDays = Math.round(
      medianCycleDays * (1 - cumulativeProgress / 100)
    );

    // Calculate actual remaining days
    const actualRemainingDays = Math.round(
      (deal.closeDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if close date is in the past
    if (actualRemainingDays < 0) {
      const daysOverdue = Math.abs(actualRemainingDays);
      return {
        validatorId: this.id,
        dealId: deal.id,
        severity: 'error',
        title: 'Close Date Has Passed',
        description: `Close date was ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} ago (${this.formatDate(deal.closeDate)}). Deal is still in ${deal.stage.name}.`,
        confidence: this.getConfidenceLevel(benchmarks, deal.amount),
        dataPoints: {
          closeDate: deal.closeDate,
          actualRemainingDays,
          expectedRemainingDays,
          medianCycleDays,
          currentStage: deal.stage.name,
          stageCategory,
          cumulativeProgress,
          dealAmount: deal.amount,
          benchmarkSource,
          ratio: 0, // Past due has no ratio
        },
      };
    }

    // Calculate ratio of actual to expected
    const ratio = expectedRemainingDays > 0 ? actualRemainingDays / expectedRemainingDays : 1;

    // Apply thresholds
    if (ratio < 0.3) {
      return {
        validatorId: this.id,
        dealId: deal.id,
        severity: 'error',
        title: 'Unrealistic Close Date',
        description: `Close date is in ${actualRemainingDays} day${actualRemainingDays === 1 ? '' : 's'}, but deals at this stage typically need ${expectedRemainingDays}+ days to close (based on ${this.formatAmount(deal.amount)} deals with median cycle of ${medianCycleDays} days).`,
        confidence: this.getConfidenceLevel(benchmarks, deal.amount),
        dataPoints: {
          closeDate: deal.closeDate,
          actualRemainingDays,
          expectedRemainingDays,
          medianCycleDays,
          currentStage: deal.stage.name,
          stageCategory,
          cumulativeProgress,
          dealAmount: deal.amount,
          benchmarkSource,
          ratio,
        },
      };
    }

    if (ratio >= 0.3 && ratio < 0.5) {
      return {
        validatorId: this.id,
        dealId: deal.id,
        severity: 'warning',
        title: 'Ambitious Close Date',
        description: `Close date appears ambitious. ${actualRemainingDays} day${actualRemainingDays === 1 ? '' : 's'} remaining vs typical ${expectedRemainingDays} days for deals at this stage.`,
        confidence: this.getConfidenceLevel(benchmarks, deal.amount),
        dataPoints: {
          closeDate: deal.closeDate,
          actualRemainingDays,
          expectedRemainingDays,
          medianCycleDays,
          currentStage: deal.stage.name,
          stageCategory,
          cumulativeProgress,
          dealAmount: deal.amount,
          benchmarkSource,
          ratio,
        },
      };
    }

    // ratio >= 0.5 means reasonable close date
    return null;
  }

  /**
   * Get median cycle days for the deal's amount segment
   */
  private getMedianCycleDays(amount: number, benchmarks: BenchmarkMetadata): number {
    // Try to find the matching segment
    const segment = benchmarks.cycleLengthBySegment.find(
      (seg: CycleSegment) => amount >= seg.minAmount && (amount < seg.maxAmount || seg.maxAmount === Infinity)
    );

    if (segment && segment.dealCount > 0) {
      return segment.medianCycleDays;
    }

    // Fall back to overall median
    return benchmarks.medianCycleLength || 75; // Industry default if nothing available
  }

  /**
   * Calculate cumulative progress percentage at a given stage
   */
  private calculateCumulativeProgress(
    currentStageCategory: StageCategory,
    stageDistribution: StageTimeDistribution[]
  ): number {
    // Define stage order
    const stageOrder: StageCategory[] = [
      'qualification',
      'evaluation',
      'proposal',
      'closing',
    ];

    const currentIndex = stageOrder.indexOf(currentStageCategory);
    if (currentIndex === -1) {
      return 0; // Unknown stage, assume beginning
    }

    // Sum up percentages of all stages before the current one
    let cumulative = 0;
    for (let i = 0; i < currentIndex; i++) {
      const stage = stageDistribution.find(
        (s: StageTimeDistribution) => s.category === stageOrder[i]
      );
      if (stage) {
        cumulative += stage.medianPercentOfCycle;
      }
    }

    return cumulative;
  }

  /**
   * Determine confidence level based on benchmark quality and segment data
   */
  private getConfidenceLevel(benchmarks: BenchmarkMetadata, amount: number): ConfidenceLevel {
    // If using industry fallback, confidence is low
    if (benchmarks.confidence === 'low') {
      return 'low';
    }

    // Find the segment for this deal
    const segment = benchmarks.cycleLengthBySegment.find(
      (seg: CycleSegment) => amount >= seg.minAmount && (amount < seg.maxAmount || seg.maxAmount === Infinity)
    );

    // If segment has 20+ deals, high confidence
    if (segment && segment.dealCount >= 20) {
      return 'high';
    }

    // If segment exists but has < 20 deals, medium confidence
    if (segment && segment.dealCount > 0) {
      return 'medium';
    }

    // No segment data, use overall benchmark confidence
    return benchmarks.confidence;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format amount for display
   */
  private formatAmount(cents: number): string {
    const dollars = cents / 100;
    if (dollars >= 1000000) {
      return `$${(dollars / 1000000).toFixed(1)}M`;
    }
    if (dollars >= 1000) {
      return `$${(dollars / 1000).toFixed(0)}k`;
    }
    return `$${dollars.toFixed(0)}`;
  }
}

/**
 * Export a singleton instance for convenience
 */
export const unrealisticCloseDateValidator = new UnrealisticCloseDateValidator();
