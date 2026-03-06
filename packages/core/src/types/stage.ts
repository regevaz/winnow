export interface DealStage {
  id: string;
  name: string;
  displayOrder: number;            // Position in pipeline (0-indexed)
  probability: number;             // CRM-assigned probability (0-100)
  isClosed: boolean;
  isWon: boolean;
}

// Normalized stage category for cross-CRM compatibility
export type StageCategory =
  | 'qualification'    // Early: discovery, qualification
  | 'evaluation'       // Mid: demo, evaluation, POC
  | 'proposal'         // Late: proposal, negotiation
  | 'closing'          // Final: contract, legal review
  | 'closed_won'
  | 'closed_lost';

export interface StageMapping {
  stageId: string;
  stageName: string;
  category: StageCategory;
}
