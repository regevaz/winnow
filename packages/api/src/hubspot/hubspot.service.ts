import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { HubspotApiClient } from './hubspot-api.client';
import { HubspotSyncWriterService } from './hubspot-sync-writer.service';
import { SyncResultDto } from './dto/sync-result.dto';
import { PipelineListDto } from './dto/pipeline-list.dto';
import { mapDeal } from './mappers/deal.mapper';
import { mapContact } from './mappers/contact.mapper';
import { mapActivity } from './mappers/activity.mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HubspotService {
  private readonly logger = new Logger(HubspotService.name);

  constructor(
    private readonly apiClient: HubspotApiClient,
    private readonly writer: HubspotSyncWriterService,
    private readonly prisma: PrismaService,
  ) {}

  async sync(): Promise<SyncResultDto> {
    const startTime = Date.now();

    const orgId = await this.writer.upsertOrganization('HubSpot Organization');

    let pipelines;
    try {
      pipelines = await this.apiClient.fetchPipelines(orgId);
    } catch (err) {
      throw new BadGatewayException(`HubSpot API error: ${(err as Error).message}`);
    }

    let pipelinesUpserted = 0;
    let stagesUpserted = 0;

    // Map of hsStageId → prismaStageId across all pipelines
    const globalStageMap = new Map<string, string>();
    // Map of hsPipelineId → { pipelineId, stageMap }
    const pipelineStageMap = new Map<string, { pipelineId: string; stageMap: Map<string, string> }>();

    for (const pipeline of pipelines) {
      const pipelineId = await this.writer.upsertPipeline(orgId, pipeline);
      const stageMap = await this.writer.upsertStages(pipelineId, pipeline.stages);

      pipelinesUpserted++;
      stagesUpserted += stageMap.size;

      for (const [hsId, prismaId] of stageMap) {
        globalStageMap.set(hsId, prismaId);
      }

      pipelineStageMap.set(pipeline.id, { pipelineId, stageMap });
    }

    let allDeals;
    try {
      allDeals = await this.apiClient.fetchAllDeals(orgId);
    } catch (err) {
      throw new BadGatewayException(`HubSpot API error: ${(err as Error).message}`);
    }

    let dealsUpserted = 0;
    const ownerCache = new Map<string, Promise<string>>();

    // Process in chunks of 10
    const chunkSize = 10;
    for (let i = 0; i < allDeals.length; i += chunkSize) {
      const chunk = allDeals.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (deal) => {
          try {
            const hsPipelineId = deal.properties.pipeline;
            const pipelineInfo = hsPipelineId
              ? pipelineStageMap.get(hsPipelineId)
              : undefined;

            if (!pipelineInfo) {
              this.logger.warn(`Deal ${deal.id} has unknown pipeline ${hsPipelineId}, skipping`);
              return;
            }

            const { pipelineId, stageMap } = pipelineInfo;

            // Fetch owner name (cached per sync — store the promise to avoid duplicate concurrent fetches)
            const ownerId = deal.properties.hubspot_owner_id;
            let ownerName = '';
            if (ownerId) {
              if (!ownerCache.has(ownerId)) {
                ownerCache.set(
                  ownerId,
                  this.apiClient.fetchOwnerName(ownerId, orgId).catch(() => ''),
                );
              }
              ownerName = (await ownerCache.get(ownerId)) ?? '';
            }

            const [contacts, engagements, stageHistoryEntries] = await Promise.all([
              this.apiClient.fetchContactsForDeal(deal.id, orgId),
              this.apiClient.fetchEngagementsForDeal(deal.id, orgId),
              this.apiClient.fetchStageHistory(deal.id, orgId),
            ]);

            const mappedDeal = mapDeal(deal, ownerName, stageMap, stageHistoryEntries);
            const dealId = await this.writer.upsertDeal(pipelineId, stageMap, mappedDeal);

            const mappedContacts = contacts.map(mapContact);
            const mappedActivities = engagements
              .map((e) => mapActivity(e, dealId))
              .filter((a): a is NonNullable<typeof a> => a !== null);
            const mappedHistory = mappedDeal.stageHistory;

            await Promise.all([
              this.writer.upsertContactsForDeal(dealId, mappedContacts),
              this.writer.upsertActivitiesForDeal(dealId, mappedActivities),
              this.writer.upsertStageHistoryForDeal(dealId, mappedHistory),
            ]);

            dealsUpserted++;
          } catch (err) {
            this.logger.error(`Failed to sync deal ${deal.id}: ${(err as Error).message}`);
          }
        }),
      );
    }

    // Update crmConnectedAt
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { crmConnectedAt: new Date() },
    });

    const durationMs = Date.now() - startTime;

    return {
      dealsUpserted,
      pipelinesUpserted,
      stagesUpserted,
      durationMs,
      syncedAt: new Date().toISOString(),
    };
  }

  async listPipelines(): Promise<PipelineListDto[]> {
    const pipelines = await this.prisma.pipeline.findMany({
      include: { stages: true },
    });

    return pipelines.map((p) => ({
      externalId: p.externalId,
      name: p.name,
      stageCount: p.stages.length,
      stages: p.stages.map((s) => ({
        externalId: s.externalId,
        name: s.name,
        displayOrder: s.displayOrder,
        probability: s.probability,
        isClosed: s.isClosed,
        isWon: s.isWon,
      })),
    }));
  }
}
