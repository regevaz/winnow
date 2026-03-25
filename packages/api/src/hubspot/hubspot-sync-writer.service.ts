import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HubSpotPipeline, HubSpotPipelineStage } from './types/hubspot-api.types';
import { MappedDeal, MappedStageHistory } from './mappers/deal.mapper';
import { MappedContact } from './mappers/contact.mapper';
import { MappedActivity } from './mappers/activity.mapper';
import { mapStageCategory } from './mappers/stage-category.mapper';

@Injectable()
export class HubspotSyncWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertOrganization(name: string): Promise<string> {
    const existing = await this.prisma.organization.findFirst({
      where: { crmType: 'hubspot' },
      orderBy: { crmConnectedAt: 'desc' },
    });

    if (existing) return existing.id;

    const org = await this.prisma.organization.create({
      data: { name, crmType: 'hubspot' },
    });

    return org.id;
  }

  async upsertPipeline(orgId: string, hs: HubSpotPipeline): Promise<string> {
    const pipeline = await this.prisma.pipeline.upsert({
      where: {
        organizationId_externalId: {
          organizationId: orgId,
          externalId: hs.id,
        },
      },
      update: { name: hs.label },
      create: {
        externalId: hs.id,
        name: hs.label,
        organizationId: orgId,
      },
    });

    return pipeline.id;
  }

  async upsertStages(
    pipelineId: string,
    stages: HubSpotPipelineStage[],
  ): Promise<Map<string, string>> {
    const stageMap = new Map<string, string>();

    for (const stage of stages) {
      const probability = Math.round(parseFloat(stage.metadata.probability || '0') * 100);
      const isClosed = stage.metadata.isClosed === 'true';
      const isWon = probability === 100 && isClosed;
      const category = mapStageCategory(stage.label, probability, isClosed, isWon);

      const record = await this.prisma.stage.upsert({
        where: {
          pipelineId_externalId: {
            pipelineId,
            externalId: stage.id,
          },
        },
        update: {
          name: stage.label,
          displayOrder: stage.displayOrder,
          probability,
          isClosed,
          isWon,
          category,
        },
        create: {
          externalId: stage.id,
          name: stage.label,
          displayOrder: stage.displayOrder,
          probability,
          isClosed,
          isWon,
          category,
          pipelineId,
        },
      });

      stageMap.set(stage.id, record.id);
    }

    return stageMap;
  }

  async upsertDeal(
    pipelineId: string,
    stageMap: Map<string, string>,
    deal: MappedDeal,
  ): Promise<string> {
    const stageId = deal.stageId ?? [...stageMap.values()][0] ?? '';

    const record = await this.prisma.deal.upsert({
      where: {
        pipelineId_externalId: {
          pipelineId,
          externalId: deal.externalId,
        },
      },
      update: {
        name: deal.name,
        amount: deal.amount,
        currency: deal.currency,
        closeDate: deal.closeDate,
        lastModifiedAt: deal.lastModifiedAt,
        ownerId: deal.ownerId,
        ownerName: deal.ownerName,
        stageId,
      },
      create: {
        externalId: deal.externalId,
        name: deal.name,
        amount: deal.amount,
        currency: deal.currency,
        closeDate: deal.closeDate,
        createdAt: deal.createdAt,
        lastModifiedAt: deal.lastModifiedAt,
        ownerId: deal.ownerId,
        ownerName: deal.ownerName,
        stageId,
        pipelineId,
      },
    });

    return record.id;
  }

  async upsertContactsForDeal(dealId: string, contacts: MappedContact[]): Promise<void> {
    await this.prisma.contact.deleteMany({ where: { dealId } });

    if (contacts.length > 0) {
      await this.prisma.contact.createMany({
        data: contacts.map((c) => ({
          externalId: c.externalId,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          seniorityLevel: c.seniorityLevel,
          role: c.role,
          addedAt: c.addedAt,
          dealId,
        })),
      });
    }
  }

  async upsertActivitiesForDeal(dealId: string, activities: MappedActivity[]): Promise<void> {
    await this.prisma.activity.deleteMany({ where: { dealId } });

    if (activities.length > 0) {
      await this.prisma.activity.createMany({
        data: activities.map((a) => ({
          type: a.type,
          timestamp: a.timestamp,
          description: a.description,
          dealId,
        })),
      });
    }
  }

  async upsertStageHistoryForDeal(
    dealId: string,
    history: MappedStageHistory[],
  ): Promise<void> {
    await this.prisma.stageHistory.deleteMany({ where: { dealId } });

    if (history.length > 0) {
      await this.prisma.stageHistory.createMany({
        data: history.map((h) => ({
          fromStage: h.fromStage,
          toStage: h.toStage,
          changedAt: h.changedAt,
          dealId,
        })),
      });
    }
  }
}
