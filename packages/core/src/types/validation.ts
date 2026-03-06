import { Deal } from './deal';
import { StageCategory } from './stage';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidatorId =
  | 'unrealistic_close_date'
  | 'missing_buying_committee'
  | 'stage_activity_mismatch';

export interface ValidationResult {
  validatorId: ValidatorId;
  dealId: string;
  severity: ValidationSeverity;
  title: string;                    // Human-readable title (e.g., "Unrealistic Close Date")
  description: string;              // Detailed explanation with specific data points
  dataPoints: Record<string, any>;  // Structured evidence (for UI rendering)
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
  medianCycleLength: number | null;      // Days
  cycleLengthBySegment: CycleSegment[];
  stageDistribution: StageTimeDistribution[];
  contactCountBySegment: ContactSegment[];
  confidence: ConfidenceLevel;
  message: string | null;                 // e.g., "Based on 12 deals. Accuracy improves with more data."
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
  medianPercentOfCycle: number;          // 0-100
}

export interface ContactSegment {
  minAmount: number;
  maxAmount: number;
  medianContacts: number;
  p25Contacts: number;                    // 25th percentile - used as threshold
  dealCount: number;
}
