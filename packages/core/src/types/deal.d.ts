import { DealStage } from './stage';
export interface Deal {
    id: string;
    externalId: string;
    name: string;
    stage: DealStage;
    stageId: string;
    amount: number;
    currency: string;
    closeDate: Date;
    createdAt: Date;
    lastModifiedAt: Date;
    ownerId: string;
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
    seniorityLevel: SeniorityLevel | null;
    role: string | null;
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
export type ActivityType = 'stage_change' | 'contact_added' | 'note_created' | 'task_created' | 'task_completed' | 'field_updated';
export type SeniorityLevel = 'c_level' | 'vp' | 'director' | 'manager' | 'individual' | 'unknown';
//# sourceMappingURL=deal.d.ts.map