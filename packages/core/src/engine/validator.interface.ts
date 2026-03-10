import {
  ValidatorId,
  ValidationResult,
  BenchmarkMetadata,
  StageMapping,
  Deal,
} from '../types';

/**
 * ValidationContext provides the contextual data needed by validators
 */
export interface ValidationContext {
  benchmarks: BenchmarkMetadata;
  stageMappings: StageMapping[];
  currentDate: Date;  // Injected for testability, never use Date.now() directly
}

/**
 * Validator interface that all validation rules must implement
 */
export interface Validator {
  id: ValidatorId;
  name: string;
  description: string;

  /**
   * Validate a deal against this rule
   * @param deal The deal to validate
   * @param context Contextual data for validation (benchmarks, stage mappings, etc.)
   * @returns ValidationResult if an issue is found, null if deal passes validation
   */
  validate(deal: Deal, context: ValidationContext): ValidationResult | null;
}
