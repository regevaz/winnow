import {
  ClosedDealRecord,
  BenchmarkConfig,
  BenchmarkMetadata,
  CycleSegment,
  StageTimeDistribution,
  StageCategory,
  ContactSegment,
  ConfidenceLevel,
  DEFAULT_BENCHMARK_CONFIG,
  INDUSTRY_FALLBACK_BENCHMARKS,
} from '../types';
import { median, percentile, segmentize } from '../utils/stats';

export class BenchmarkService {
  /**
   * Compute benchmarks from closed-won deal history
   */
  static computeBenchmarks(
    closedDeals: ClosedDealRecord[],
    config: BenchmarkConfig = DEFAULT_BENCHMARK_CONFIG
  ): BenchmarkMetadata {
    const dealCount = closedDeals.length;

    // Determine confidence level
    const confidence = this.calculateConfidence(dealCount);

    // If insufficient data, use fallback benchmarks
    if (dealCount < config.minDealsForBenchmark) {
      return this.createFallbackBenchmarks(dealCount, confidence);
    }

    // Filter deals within lookback window
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - config.lookbackMonths);
    const recentDeals = closedDeals.filter(deal => deal.closedAt >= cutoffDate);

    // If filtered deals are insufficient, use all available deals
    const dealsToAnalyze = recentDeals.length >= config.minDealsForBenchmark
      ? recentDeals
      : closedDeals;

    // Compute cycle length by segment
    const cycleLengthBySegment = this.computeCycleLengthBySegment(
      dealsToAnalyze,
      config.amountSegments
    );

    // Compute overall median cycle length
    const allCycleLengths = dealsToAnalyze.map(d => d.cycleLengthDays);
    const medianCycleLength = median(allCycleLengths);

    // Compute stage time distribution
    const stageDistribution = this.computeStageDistribution(dealsToAnalyze);

    // Compute contact count by segment
    const contactCountBySegment = this.computeContactCountBySegment(
      dealsToAnalyze,
      config.amountSegments
    );

    // Create message for low/medium confidence
    const message = this.createConfidenceMessage(dealCount, confidence);

    return {
      closedWonDealsAnalyzed: dealCount,
      medianCycleLength,
      cycleLengthBySegment,
      stageDistribution,
      contactCountBySegment,
      confidence,
      message,
    };
  }

  /**
   * Calculate confidence level based on deal count
   */
  private static calculateConfidence(dealCount: number): ConfidenceLevel {
    if (dealCount >= 50) return 'high';
    if (dealCount >= 20) return 'medium';
    return 'low';
  }

  /**
   * Create fallback benchmarks when insufficient historical data
   */
  private static createFallbackBenchmarks(
    dealCount: number,
    confidence: ConfidenceLevel
  ): BenchmarkMetadata {
    const { medianCycleDays, stageDistribution, contactsByAmount } = INDUSTRY_FALLBACK_BENCHMARKS;

    // Convert fallback stage distribution to StageTimeDistribution format
    const stageTimeDistribution: StageTimeDistribution[] = stageDistribution.map(s => ({
      stageId: '', // No specific stage ID for fallback
      stageName: s.category,
      category: s.category,
      medianDaysInStage: Math.round((medianCycleDays * s.percentOfCycle) / 100),
      medianPercentOfCycle: s.percentOfCycle,
    }));

    // Convert fallback contacts by amount to ContactSegment format
    const contactCountBySegment: ContactSegment[] = contactsByAmount.map((c, index) => ({
      minAmount: index === 0 ? 0 : contactsByAmount[index - 1].maxAmount,
      maxAmount: c.maxAmount,
      medianContacts: c.minContacts + 1, // Slightly above minimum
      p25Contacts: c.minContacts,
      dealCount: 0,
    }));

    // Create default cycle segments
    const cycleLengthBySegment: CycleSegment[] = DEFAULT_BENCHMARK_CONFIG.amountSegments.map(seg => ({
      minAmount: seg.min,
      maxAmount: seg.max,
      medianCycleDays,
      dealCount: 0,
    }));

    return {
      closedWonDealsAnalyzed: dealCount,
      medianCycleLength: medianCycleDays,
      cycleLengthBySegment,
      stageDistribution: stageTimeDistribution,
      contactCountBySegment,
      confidence,
      message: dealCount === 0
        ? 'No historical data available. Using industry benchmarks.'
        : `Based on only ${dealCount} deal${dealCount === 1 ? '' : 's'}. Using industry benchmarks. Accuracy improves with more data.`,
    };
  }

  /**
   * Compute median cycle length per deal size segment
   */
  private static computeCycleLengthBySegment(
    deals: ClosedDealRecord[],
    segments: { min: number; max: number; label: string }[]
  ): CycleSegment[] {
    const segmented = segmentize(deals, segments, deal => deal.amount);

    return segments.map(segment => {
      const dealsInSegment = segmented.get(segment.label) || [];

      if (dealsInSegment.length === 0) {
        return {
          minAmount: segment.min,
          maxAmount: segment.max,
          medianCycleDays: INDUSTRY_FALLBACK_BENCHMARKS.medianCycleDays,
          dealCount: 0,
        };
      }

      const cycleLengths = dealsInSegment.map(d => d.cycleLengthDays);
      const medianCycleDays = median(cycleLengths);

      return {
        minAmount: segment.min,
        maxAmount: segment.max,
        medianCycleDays: Math.round(medianCycleDays),
        dealCount: dealsInSegment.length,
      };
    });
  }

  /**
   * Compute stage time distribution (median % of cycle per stage)
   */
  private static computeStageDistribution(
    deals: ClosedDealRecord[]
  ): StageTimeDistribution[] {
    // Collect all stage data from all deals
    const stageDataMap = new Map<string, {
      stageId: string;
      stageName: string;
      category: string;
      percents: number[];
      daysInStage: number[];
    }>();

    for (const deal of deals) {
      for (const stageEntry of deal.stageTimeline) {
        const key = stageEntry.stageId || stageEntry.stageName;

        if (!stageDataMap.has(key)) {
          stageDataMap.set(key, {
            stageId: stageEntry.stageId,
            stageName: stageEntry.stageName,
            category: '', // Will be inferred if needed
            percents: [],
            daysInStage: [],
          });
        }

        const data = stageDataMap.get(key)!;
        data.percents.push(stageEntry.percentOfCycle);
        data.daysInStage.push(stageEntry.daysInStage);
      }
    }

    // Compute medians for each stage
    const distribution: StageTimeDistribution[] = [];

    for (const data of stageDataMap.values()) {
      if (data.percents.length === 0) continue;

      distribution.push({
        stageId: data.stageId,
        stageName: data.stageName,
        category: data.category as StageCategory, // Category would need to be provided by deal timeline
        medianDaysInStage: Math.round(median(data.daysInStage)),
        medianPercentOfCycle: Math.round(median(data.percents) * 10) / 10, // Round to 1 decimal
      });
    }

    return distribution.sort((a, b) => a.medianPercentOfCycle - b.medianPercentOfCycle);
  }

  /**
   * Compute contact count percentiles per deal size segment
   */
  private static computeContactCountBySegment(
    deals: ClosedDealRecord[],
    segments: { min: number; max: number; label: string }[]
  ): ContactSegment[] {
    const segmented = segmentize(deals, segments, deal => deal.amount);

    return segments.map(segment => {
      const dealsInSegment = segmented.get(segment.label) || [];

      if (dealsInSegment.length === 0) {
        // Use fallback
        const fallback = INDUSTRY_FALLBACK_BENCHMARKS.contactsByAmount.find(
          c => segment.max <= c.maxAmount || c.maxAmount === Infinity
        );

        return {
          minAmount: segment.min,
          maxAmount: segment.max,
          medianContacts: fallback?.minContacts || 2,
          p25Contacts: fallback?.minContacts || 1,
          dealCount: 0,
        };
      }

      const contactCounts = dealsInSegment.map(d => d.contactCount);
      const medianContacts = Math.round(median(contactCounts));
      const p25Contacts = Math.round(percentile(contactCounts, 25));

      return {
        minAmount: segment.min,
        maxAmount: segment.max,
        medianContacts,
        p25Contacts,
        dealCount: dealsInSegment.length,
      };
    });
  }

  /**
   * Create confidence message
   */
  private static createConfidenceMessage(
    dealCount: number,
    confidence: ConfidenceLevel
  ): string | null {
    if (confidence === 'high') {
      return null;
    }

    if (confidence === 'medium') {
      return `Based on ${dealCount} deals. Accuracy improves with more data (50+ deals recommended).`;
    }

    return `Based on ${dealCount} deals. Limited data may affect accuracy. 20+ deals recommended.`;
  }
}
