import { ActivityType } from '@winnow/core';
import { HubSpotEngagement } from '../types/hubspot-api.types';
import { mapEngagementType } from './activity-type.mapper';

export interface MappedActivity {
  type: ActivityType;
  timestamp: Date;
  description: string | null;
  dealId: string;
}

export function mapActivity(engagement: HubSpotEngagement, dealId: string): MappedActivity | null {
  const p = engagement.properties;
  const type = mapEngagementType(p.hs_engagement_type, p.hs_task_status ?? undefined);

  if (!type) return null;

  return {
    type,
    timestamp: new Date(p.hs_timestamp),
    description: p.hs_body_preview ?? null,
    dealId,
  };
}
