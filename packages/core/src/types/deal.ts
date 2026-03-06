import { DealStage } from './stage';

export interface Deal {
  id: string;
  externalId: string;              // CRM deal ID (e.g., HubSpot deal ID)
  name: string;
  stage: DealStage;
  stageId: string;                 // Raw CRM stage identifier
  amount: number;                  // Deal value in cents
  currency: string;                // ISO 4217 (e.g., "USD")
  closeDate: Date;
  createdAt: Date;
  lastModifiedAt: Date;
  ownerId: string;                 // Sales rep ID
  ownerName: string;
  pipelineId: string;
  contacts: DealContact[];
  activities: DealActivity[];
  stageHistory: StageChange[];
}

export interface DealContact {
  id: string;
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  seniorityLevel: SeniorityLevel | null;   // Derived from title
  role: string | null;                      // CRM contact role on deal
  addedAt: Date;
}

export interface DealActivity {
  id: string;
  type: ActivityType;
  timestamp: Date;
  description: string | null;
}

export interface StageChange {
  fromStage: string;
  toStage: string;
  changedAt: Date;
}

export type ActivityType =
  | 'stage_change'
  | 'contact_added'
  | 'note_created'
  | 'task_created'
  | 'task_completed'
  | 'field_updated';

export type SeniorityLevel =
  | 'c_level'        // CEO, CTO, CFO, COO, CRO, CMO
  | 'vp'             // VP, SVP, EVP
  | 'director'       // Director, Senior Director
  | 'manager'        // Manager, Senior Manager, Head of
  | 'individual'     // All others
  | 'unknown';
