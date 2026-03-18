export interface HubSpotPaginatedResponse<T> {
  results: T[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

export interface HubSpotPipelineStage {
  id: string;
  label: string;
  displayOrder: number;
  metadata: {
    probability: string;
    isClosed: string;
  };
}

export interface HubSpotPipeline {
  id: string;
  label: string;
  displayOrder: number;
  stages: HubSpotPipelineStage[];
}

export interface HubSpotDealProperties {
  dealname: string;
  amount: string | null;
  currency: string | null;
  closedate: string | null;
  pipeline: string | null;
  dealstage: string | null;
  createdate: string;
  hs_lastmodifieddate: string;
  hubspot_owner_id: string | null;
}

export interface HubSpotDeal {
  id: string;
  properties: HubSpotDealProperties;
}

export interface HubSpotContactProperties {
  email: string;
  firstname: string | null;
  lastname: string | null;
  jobtitle: string | null;
  createdate: string;
}

export interface HubSpotContact {
  id: string;
  properties: HubSpotContactProperties;
}

export interface HubSpotEngagementProperties {
  hs_engagement_type: string;
  hs_timestamp: string;
  hs_body_preview: string | null;
  hs_task_status: string | null;
}

export interface HubSpotEngagement {
  id: string;
  properties: HubSpotEngagementProperties;
}

export interface HubSpotPropertyHistoryEntry {
  value: string;
  timestamp: string;
  sourceType: string;
}

export interface HubSpotAssociation {
  id: string;
  type: string;
}

export interface HubSpotActivityEngagementProperties {
  hs_engagement_type: string;
  hs_timestamp: string;
  hs_body_preview: string | null;
  hs_task_status: string | null;
  hs_meeting_title: string | null;
  hs_meeting_outcome: string | null;
  hs_call_body: string | null;
  hs_email_subject: string | null;
}

export interface HubSpotActivityEngagement {
  id: string;
  properties: HubSpotActivityEngagementProperties;
}

/** Cleaned activity content ready for prompt injection */
export interface HubSpotActivityContent {
  id: string;
  type: string;
  timestamp: Date;
  content: string; // max 300 chars
}
