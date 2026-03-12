import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BenchmarkMetadata,
  BenchmarkConfig,
  DEFAULT_BENCHMARK_CONFIG,
  ClosedDealRecord,
  BenchmarkService as CoreBenchmarkService,
} from '@winnow/core';

@Injectable()
export class BenchmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async computeBenchmarks(
    organizationId: string,
    config: BenchmarkConfig = DEFAULT_BENCHMARK_CONFIG
  ): Promise<BenchmarkMetadata> {
    const closedWonDeals = await this.getClosedWonDeals(organizationId, config.lookbackMonths);
    return CoreBenchmarkService.computeBenchmarks(closedWonDeals, config);
  }

  private async getClosedWonDeals(
    organizationId: string,
    lookbackMonths: number
  ): Promise<ClosedDealRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

    const deals = await this.prisma.deal.findMany({
      where: {
        pipeline: { organizationId },
        createdAt: { gte: cutoffDate },
      },
      include: {
        contacts: true,
        stageHistory: true,
        activities: true,
      },
    });

    // Get all stages for this organization
    const stages = await this.prisma.stage.findMany({
      where: {
        pipeline: { organizationId },
      },
    });

    const stageMap = new Map(stages.map((s) => [s.id, s]));

    // Filter to closed-won deals and map to ClosedDealRecord
    const closedWonRecords: ClosedDealRecord[] = [];

    for (const deal of deals) {
      const stage = stageMap.get(deal.stageId);
      if (!stage || !stage.isClosed || !stage.isWon) {
        continue;
      }

      const cycleLengthDays = Math.floor(
        (deal.lastModifiedAt.getTime() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Build stage timeline
      const stageTimeline = this.buildStageTimeline(deal, stageMap, cycleLengthDays);

      closedWonRecords.push({
        id: deal.id,
        amount: deal.amount,
        cycleLengthDays,
        contactCount: deal.contacts.length,
        stageTimeline,
        closedAt: deal.lastModifiedAt,
      });
    }

    return closedWonRecords;
  }

  private buildStageTimeline(
    deal: any,
    stageMap: Map<string, any>,
    totalCycleDays: number
  ): ClosedDealRecord['stageTimeline'] {
    if (!deal.stageHistory || deal.stageHistory.length === 0) {
      // No stage history, assume deal spent all time in final stage
      const stage = stageMap.get(deal.stageId);
      return stage
        ? [
            {
              stageId: stage.id,
              stageName: stage.name,
              daysInStage: totalCycleDays,
              percentOfCycle: 100,
            },
          ]
        : [];
    }

    // Sort stage history by date
    const history = [...deal.stageHistory].sort(
      (a, b) => a.changedAt.getTime() - b.changedAt.getTime()
    );

    const timeline: ClosedDealRecord['stageTimeline'] = [];
    let previousDate = deal.createdAt;

    for (const change of history) {
      const daysInStage = Math.floor(
        (change.changedAt.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find stage info for fromStage
      const stage = Array.from(stageMap.values()).find((s) => s.id === change.fromStage);

      if (stage && daysInStage > 0) {
        timeline.push({
          stageId: stage.id,
          stageName: stage.name,
          daysInStage,
          percentOfCycle: totalCycleDays > 0 ? (daysInStage / totalCycleDays) * 100 : 0,
        });
      }

      previousDate = change.changedAt;
    }

    // Add final stage
    const finalDays = Math.floor(
      (deal.lastModifiedAt.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const finalStage = stageMap.get(deal.stageId);

    if (finalStage && finalDays >= 0) {
      timeline.push({
        stageId: finalStage.id,
        stageName: finalStage.name,
        daysInStage: finalDays,
        percentOfCycle: totalCycleDays > 0 ? (finalDays / totalCycleDays) * 100 : 0,
      });
    }

    return timeline;
  }
}
