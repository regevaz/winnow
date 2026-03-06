import { Deal } from './deal';
import { StageCategory } from './stage';
export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidatorId = 'unrealistic_close_date' | 'missing_buying_committee' | 'stage_activity_mismatch';
export interface ValidationResult {
    validatorId: ValidatorId;
    dealId: string;
    severity: ValidationSeverity;
    title: string;
    description: string;
    dataPoints: Record<string, any>;
    confidence: ConfidenceLevel;
}
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export interface PipelineIntegrityReport {
    generatedAt: Date;
    pipelineId: string;
    totalDeals: number;
    summary: {
        errors: number;
        warnings: number;
        healthy: number;
    };
    dealResults: DealValidationResult[];
    benchmarkMetadata: BenchmarkMetadata;
}
export interface DealValidationResult {
    deal: Deal;
    validations: ValidationResult[];
    status: 'error' | 'warning' | 'healthy';
}
export interface BenchmarkMetadata {
    closedWonDealsAnalyzed: number;
    medianCycleLength: number | null;
    cycleLengthBySegment: CycleSegment[];
    stageDistribution: StageTimeDistribution[];
    contactCountBySegment: ContactSegment[];
    confidence: ConfidenceLevel;
    message: string | null;
}
export interface CycleSegment {
    minAmount: number;
    maxAmount: number;
    medianCycleDays: number;
    dealCount: number;
}
export interface StageTimeDistribution {
    stageId: string;
    stageName: string;
    category: StageCategory;
    medianDaysInStage: number;
    medianPercentOfCycle: number;
}
export interface ContactSegment {
    minAmount: number;
    maxAmount: number;
    medianContacts: number;
    p25Contacts: number;
    dealCount: number;
}
//# sourceMappingURL=validation.d.ts.map