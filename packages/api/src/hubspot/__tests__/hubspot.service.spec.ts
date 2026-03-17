import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { HubspotService } from '../hubspot.service';
import { HubspotApiClient } from '../hubspot-api.client';
import { HubspotSyncWriterService } from '../hubspot-sync-writer.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPipeline = {
  id: 'hs-pipeline-1',
  label: 'Sales Pipeline',
  displayOrder: 0,
  stages: [
    {
      id: 'hs-stage-1',
      label: 'Qualification',
      displayOrder: 0,
      metadata: { probability: '0.2', isClosed: 'false' },
    },
  ],
};

const mockDeal = {
  id: 'hs-deal-1',
  properties: {
    dealname: 'Test Deal',
    amount: '1000',
    currency: 'USD',
    closedate: '2025-12-31T00:00:00Z',
    pipeline: 'hs-pipeline-1',
    dealstage: 'hs-stage-1',
    createdate: '2025-01-01T00:00:00Z',
    hs_lastmodifieddate: '2025-06-01T00:00:00Z',
    hubspot_owner_id: 'owner-1',
  },
};

describe('HubspotService', () => {
  let service: HubspotService;
  let apiClient: jest.Mocked<HubspotApiClient>;
  let writer: jest.Mocked<HubspotSyncWriterService>;
  let prisma: { organization: { update: jest.Mock } };

  beforeEach(async () => {
    const stageMap = new Map([['hs-stage-1', 'prisma-stage-uuid-1']]);

    apiClient = {
      fetchPipelines: jest.fn().mockResolvedValue([mockPipeline]),
      fetchAllDeals: jest.fn().mockResolvedValue([mockDeal]),
      fetchContactsForDeal: jest.fn().mockResolvedValue([]),
      fetchEngagementsForDeal: jest.fn().mockResolvedValue([]),
      fetchStageHistory: jest.fn().mockResolvedValue([]),
      fetchOwnerName: jest.fn().mockResolvedValue('Jane Doe'),
    } as unknown as jest.Mocked<HubspotApiClient>;

    writer = {
      upsertOrganization: jest.fn().mockResolvedValue('org-uuid'),
      upsertPipeline: jest.fn().mockResolvedValue('pipeline-uuid'),
      upsertStages: jest.fn().mockResolvedValue(stageMap),
      upsertDeal: jest.fn().mockResolvedValue('deal-uuid'),
      upsertContactsForDeal: jest.fn().mockResolvedValue(undefined),
      upsertActivitiesForDeal: jest.fn().mockResolvedValue(undefined),
      upsertStageHistoryForDeal: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<HubspotSyncWriterService>;

    prisma = {
      organization: { update: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HubspotService,
        { provide: HubspotApiClient, useValue: apiClient },
        { provide: HubspotSyncWriterService, useValue: writer },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<HubspotService>(HubspotService);
  });

  describe('sync()', () => {
    it('returns sync result with correct counts', async () => {
      const result = await service.sync();

      expect(result.pipelinesUpserted).toBe(1);
      expect(result.stagesUpserted).toBe(1);
      expect(result.dealsUpserted).toBe(1);
      expect(result.syncedAt).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('calls upsertOrganization once', async () => {
      await service.sync();
      expect(writer.upsertOrganization).toHaveBeenCalledTimes(1);
    });

    it('upserts pipeline and stages for each HubSpot pipeline', async () => {
      await service.sync();
      expect(writer.upsertPipeline).toHaveBeenCalledWith('org-uuid', mockPipeline);
      expect(writer.upsertStages).toHaveBeenCalledWith('pipeline-uuid', mockPipeline.stages);
    });

    it('fetches owner name and caches it', async () => {
      const twoDeals = [
        mockDeal,
        { ...mockDeal, id: 'hs-deal-2' },
      ];
      apiClient.fetchAllDeals.mockResolvedValue(twoDeals);

      await service.sync();

      // Should only fetch owner once despite two deals with same owner
      expect(apiClient.fetchOwnerName).toHaveBeenCalledTimes(1);
    });

    it('throws BadGatewayException when fetchPipelines fails', async () => {
      apiClient.fetchPipelines.mockRejectedValue(new Error('Network error'));
      await expect(service.sync()).rejects.toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when fetchAllDeals fails', async () => {
      apiClient.fetchAllDeals.mockRejectedValue(new Error('Network error'));
      await expect(service.sync()).rejects.toThrow(BadGatewayException);
    });

    it('continues sync when individual deal processing fails', async () => {
      apiClient.fetchContactsForDeal.mockRejectedValue(new Error('Contact fetch failed'));

      const result = await service.sync();
      // Deal failed but sync continued
      expect(result.dealsUpserted).toBe(0);
      expect(result.pipelinesUpserted).toBe(1);
    });

    it('updates crmConnectedAt on organization after sync', async () => {
      await service.sync();
      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org-uuid' },
          data: expect.objectContaining({ crmConnectedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
