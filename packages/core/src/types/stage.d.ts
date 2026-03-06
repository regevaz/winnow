export interface DealStage {
    id: string;
    name: string;
    displayOrder: number;
    probability: number;
    isClosed: boolean;
    isWon: boolean;
}
export type StageCategory = 'qualification' | 'evaluation' | 'proposal' | 'closing' | 'closed_won' | 'closed_lost';
export interface StageMapping {
    stageId: string;
    stageName: string;
    category: StageCategory;
}
//# sourceMappingURL=stage.d.ts.map