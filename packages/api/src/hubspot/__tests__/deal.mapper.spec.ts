import { mapDeal, mapStageHistory } from '../mappers/deal.mapper';
import { HubSpotDeal, HubSpotPropertyHistoryEntry } from '../types/hubspot-api.types';

const makeStageMap = () =>
  new Map([
    ['hs-stage-1', 'prisma-uuid-1'],
    ['hs-stage-2', 'prisma-uuid-2'],
    ['hs-stage-3', 'prisma-uuid-3'],
  ]);

describe('mapDeal', () => {
  const deal: HubSpotDeal = {
    id: 'hs-deal-1',
    properties: {
      dealname: 'Test Deal',
      amount: '1500.50',
      currency: 'EUR',
      closedate: '2025-12-31T00:00:00Z',
      pipeline: 'pipeline-1',
      dealstage: 'hs-stage-2',
      createdate: '2025-01-01T00:00:00Z',
      hs_lastmodifieddate: '2025-06-01T00:00:00Z',
      hubspot_owner_id: 'owner-1',
    },
  };

  it('converts amount from dollars string to cents integer', () => {
    const mapped = mapDeal(deal, 'Jane Doe', makeStageMap(), []);
    expect(mapped.amount).toBe(150050);
  });

  it('maps currency correctly', () => {
    const mapped = mapDeal(deal, 'Jane Doe', makeStageMap(), []);
    expect(mapped.currency).toBe('EUR');
  });

  it('defaults currency to USD when null', () => {
    const dealNoCurrency: HubSpotDeal = {
      ...deal,
      properties: { ...deal.properties, currency: null },
    };
    const mapped = mapDeal(dealNoCurrency, 'Jane Doe', makeStageMap(), []);
    expect(mapped.currency).toBe('USD');
  });

  it('translates HubSpot stage ID to Prisma UUID', () => {
    const mapped = mapDeal(deal, 'Jane Doe', makeStageMap(), []);
    expect(mapped.stageId).toBe('prisma-uuid-2');
  });

  it('sets stageId to null when dealstage is missing', () => {
    const dealNoStage: HubSpotDeal = {
      ...deal,
      properties: { ...deal.properties, dealstage: null },
    };
    const mapped = mapDeal(dealNoStage, 'Jane Doe', makeStageMap(), []);
    expect(mapped.stageId).toBeNull();
  });

  it('sets ownerName from parameter', () => {
    const mapped = mapDeal(deal, 'Jane Doe', makeStageMap(), []);
    expect(mapped.ownerName).toBe('Jane Doe');
  });
});

describe('mapStageHistory', () => {
  it('returns empty array when no entries', () => {
    expect(mapStageHistory([], makeStageMap())).toEqual([]);
  });

  it('returns empty array when only one entry', () => {
    const entries: HubSpotPropertyHistoryEntry[] = [
      { value: 'hs-stage-1', timestamp: '2025-01-01T00:00:00Z', sourceType: 'CRM_UI' },
    ];
    expect(mapStageHistory(entries, makeStageMap())).toEqual([]);
  });

  it('creates pairs from consecutive entries', () => {
    const entries: HubSpotPropertyHistoryEntry[] = [
      { value: 'hs-stage-1', timestamp: '2025-01-01T00:00:00Z', sourceType: 'CRM_UI' },
      { value: 'hs-stage-2', timestamp: '2025-02-01T00:00:00Z', sourceType: 'CRM_UI' },
      { value: 'hs-stage-3', timestamp: '2025-03-01T00:00:00Z', sourceType: 'CRM_UI' },
    ];

    const result = mapStageHistory(entries, makeStageMap());
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      fromStage: 'prisma-uuid-1',
      toStage: 'prisma-uuid-2',
      changedAt: new Date('2025-02-01T00:00:00Z'),
    });
    expect(result[1]).toEqual({
      fromStage: 'prisma-uuid-2',
      toStage: 'prisma-uuid-3',
      changedAt: new Date('2025-03-01T00:00:00Z'),
    });
  });

  it('skips entries with unknown stage IDs', () => {
    const entries: HubSpotPropertyHistoryEntry[] = [
      { value: 'hs-stage-1', timestamp: '2025-01-01T00:00:00Z', sourceType: 'CRM_UI' },
      { value: 'unknown-stage', timestamp: '2025-02-01T00:00:00Z', sourceType: 'CRM_UI' },
      { value: 'hs-stage-3', timestamp: '2025-03-01T00:00:00Z', sourceType: 'CRM_UI' },
    ];

    const result = mapStageHistory(entries, makeStageMap());
    expect(result).toHaveLength(0);
  });

  it('sorts entries chronologically before pairing', () => {
    const entries: HubSpotPropertyHistoryEntry[] = [
      { value: 'hs-stage-2', timestamp: '2025-02-01T00:00:00Z', sourceType: 'CRM_UI' },
      { value: 'hs-stage-1', timestamp: '2025-01-01T00:00:00Z', sourceType: 'CRM_UI' },
    ];

    const result = mapStageHistory(entries, makeStageMap());
    expect(result).toHaveLength(1);
    expect(result[0].fromStage).toBe('prisma-uuid-1');
    expect(result[0].toStage).toBe('prisma-uuid-2');
  });
});
