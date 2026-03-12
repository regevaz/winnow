import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Deal, DealStage, DealContact, DealActivity, StageChange, StageMapping } from '@winnow/core';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByPipeline(pipelineId: string): Promise<Deal[]> {
    const dealsFromDb = await this.prisma.deal.findMany({
      where: { pipelineId },
      include: {
        contacts: true,
        activities: true,
        stageHistory: true,
      },
    });

    // We also need stages to construct Deal objects
    const stages = await this.prisma.stage.findMany({
      where: { pipelineId },
    });

    const stageMap = new Map(stages.map((s) => [s.id, s]));

    return dealsFromDb.map((d) => this.mapToDeal(d, stageMap));
  }

  async getStageMappings(pipelineId: string): Promise<StageMapping[]> {
    const stages = await this.prisma.stage.findMany({
      where: { pipelineId },
      orderBy: { displayOrder: 'asc' },
    });

    return stages.map((s) => ({
      stageId: s.id,
      stageName: s.name,
      category: s.category as any, // StageCategory from @winnow/core
    }));
  }

  private mapToDeal(
    dbDeal: any,
    stageMap: Map<string, any>
  ): Deal {
    const stageData = stageMap.get(dbDeal.stageId);
    if (!stageData) {
      throw new Error(`Stage ${dbDeal.stageId} not found for deal ${dbDeal.id}`);
    }

    const stage: DealStage = {
      id: stageData.id,
      name: stageData.name,
      displayOrder: stageData.displayOrder,
      probability: stageData.probability,
      isClosed: stageData.isClosed,
      isWon: stageData.isWon,
    };

    const contacts: DealContact[] = dbDeal.contacts.map((c: any) => ({
      id: c.id,
      externalId: c.externalId,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      title: c.title,
      seniorityLevel: c.seniorityLevel as any,
      role: c.role,
      addedAt: c.addedAt,
    }));

    const activities: DealActivity[] = dbDeal.activities.map((a: any) => ({
      id: a.id,
      type: a.type as any,
      timestamp: a.timestamp,
      description: a.description,
    }));

    const stageHistory: StageChange[] = dbDeal.stageHistory.map((h: any) => ({
      fromStage: h.fromStage,
      toStage: h.toStage,
      changedAt: h.changedAt,
    }));

    return {
      id: dbDeal.id,
      externalId: dbDeal.externalId,
      name: dbDeal.name,
      stage,
      stageId: dbDeal.stageId,
      amount: dbDeal.amount,
      currency: dbDeal.currency,
      closeDate: dbDeal.closeDate,
      createdAt: dbDeal.createdAt,
      lastModifiedAt: dbDeal.lastModifiedAt,
      ownerId: dbDeal.ownerId,
      ownerName: dbDeal.ownerName,
      pipelineId: dbDeal.pipelineId,
      contacts,
      activities,
      stageHistory,
    };
  }
}
