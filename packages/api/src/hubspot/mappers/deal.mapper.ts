import { HubSpotDeal, HubSpotPropertyHistoryEntry } from '../types/hubspot-api.types';

export interface MappedDeal {
  externalId: string;
  name: string;
  amount: number;
  currency: string;
  closeDate: Date;
  createdAt: Date;
  lastModifiedAt: Date;
  ownerId: string;
  ownerName: string;
  stageId: string | null;
  stageHistory: MappedStageHistory[];
}

export interface MappedStageHistory {
  fromStage: string;
  toStage: string;
  changedAt: Date;
}

export function mapDeal(
  deal: HubSpotDeal,
  ownerName: string,
  stageMap: Map<string, string>,
  stageHistoryEntries: HubSpotPropertyHistoryEntry[],
): MappedDeal {
  const p = deal.properties;

  return {
    externalId: deal.id,
    name: p.dealname,
    amount: Math.round(parseFloat(p.amount || '0') * 100),
    currency: p.currency ?? 'USD',
    closeDate: new Date(p.closedate || Date.now()),
    createdAt: new Date(p.createdate),
    lastModifiedAt: new Date(p.hs_lastmodifieddate),
    ownerId: p.hubspot_owner_id ?? '',
    ownerName,
    stageId: p.dealstage ? (stageMap.get(p.dealstage) ?? null) : null,
    stageHistory: mapStageHistory(stageHistoryEntries, stageMap),
  };
}

export function mapStageHistory(
  entries: HubSpotPropertyHistoryEntry[],
  stageMap: Map<string, string>,
): MappedStageHistory[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const result: MappedStageHistory[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const fromPrismaId = stageMap.get(sorted[i].value);
    const toPrismaId = stageMap.get(sorted[i + 1].value);

    if (!fromPrismaId || !toPrismaId) continue;

    result.push({
      fromStage: fromPrismaId,
      toStage: toPrismaId,
      changedAt: new Date(sorted[i + 1].timestamp),
    });
  }

  return result;
}
