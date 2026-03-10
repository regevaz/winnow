import {
  ValidationResult,
  Deal,
  ValidatorId,
  ValidationSeverity,
  ConfidenceLevel,
  ContactSegment,
} from '../types';
import { Validator, ValidationContext } from '../engine/validator.interface';
import { INDUSTRY_FALLBACK_BENCHMARKS } from '../types/benchmark';
import { deriveSeniorityLevel } from '../utils/seniority';

/**
 * Missing Buying Committee Validator
 *
 * Flags deals that have too few contacts associated relative to their deal value and stage.
 * Uses historical benchmark data (p25 and median contact counts per deal size segment).
 * Only validates deals in evaluation stage or later (qualification is too early).
 * Includes seniority analysis as a secondary signal for large deals.
 */
export class MissingBuyingCommitteeValidator implements Validator {
  id: ValidatorId = 'missing_buying_committee';
  name = 'Missing Buying Committee';
  description = 'Detects deals with insufficient stakeholder engagement';

  validate(deal: Deal, context: ValidationContext): ValidationResult | null {
    // Skip closed deals
    if (deal.stage.isClosed) {
      return null;
    }

    // Find deal's stage category
    const stageMapping = context.stageMappings.find(
      (m: { stageId: string }) => m.stageId === deal.stageId,
    );

    if (!stageMapping) {
      // If we can't determine stage category, skip validation
      return null;
    }

    const stageCategory = stageMapping.category;

    // Skip qualification stage - too early to flag
    if (stageCategory === 'qualification') {
      return null;
    }

    // Get expected contact thresholds
    const { minimumContacts, healthyContacts, benchmarkSource, confidence } =
      this.getContactThresholds(deal.amount, context);

    const actualContacts = deal.contacts.length;

    // Primary check: contact count vs benchmarks
    let primaryIssue: {
      severity: ValidationSeverity;
      title: string;
      description: string;
    } | null = null;

    if (actualContacts < minimumContacts) {
      primaryIssue = {
        severity: 'error',
        title: 'Missing Buying Committee',
        description: `Deal has only ${actualContacts} contact${actualContacts === 1 ? '' : 's'} but needs at least ${minimumContacts} based on deal size ($${(deal.amount / 100).toLocaleString()}) and stage (${deal.stage.name}). Deals of this size typically have ${healthyContacts}+ stakeholders.`,
      };
    } else if (actualContacts < healthyContacts) {
      primaryIssue = {
        severity: 'warning',
        title: 'Thin Buying Committee',
        description: `Deal has ${actualContacts} contacts but similar deals typically have ${healthyContacts}+. Consider identifying additional stakeholders for deal size ($${(deal.amount / 100).toLocaleString()}).`,
      };
    }

    // Secondary check: seniority analysis for large deals
    const seniorityIssue = this.checkSeniority(deal);

    // Return highest severity result
    if (primaryIssue) {
      return this.buildResult(
        deal,
        primaryIssue.severity,
        primaryIssue.title,
        primaryIssue.description,
        actualContacts,
        minimumContacts,
        healthyContacts,
        benchmarkSource,
        confidence,
      );
    } else if (seniorityIssue) {
      return this.buildResult(
        deal,
        seniorityIssue.severity,
        seniorityIssue.title,
        seniorityIssue.description,
        actualContacts,
        minimumContacts,
        healthyContacts,
        benchmarkSource,
        confidence,
      );
    }

    return null;
  }

  /**
   * Get contact thresholds for a deal based on its amount
   */
  private getContactThresholds(
    amount: number,
    context: ValidationContext,
  ): {
    minimumContacts: number;
    healthyContacts: number;
    benchmarkSource: 'historical' | 'industry_fallback';
    confidence: ConfidenceLevel;
  } {
    // Try to find segment in benchmark data
    const segment = context.benchmarks.contactCountBySegment.find(
      (s: ContactSegment) => amount >= s.minAmount && amount < s.maxAmount,
    );

    if (
      segment &&
      context.benchmarks.confidence !== 'low' &&
      segment.dealCount >= 5
    ) {
      // Use historical benchmarks
      return {
        minimumContacts: segment.p25Contacts,
        healthyContacts: segment.medianContacts,
        benchmarkSource: 'historical',
        confidence: context.benchmarks.confidence,
      };
    }

    // Fallback to industry benchmarks
    const fallback = INDUSTRY_FALLBACK_BENCHMARKS.contactsByAmount.find(
      (c) => amount < c.maxAmount,
    );

    return {
      minimumContacts: fallback?.minContacts ?? 1,
      healthyContacts: fallback?.minContacts ?? 1,
      benchmarkSource: 'industry_fallback',
      confidence: 'low',
    };
  }

  /**
   * Check for seniority-related issues in large deals
   */
  private checkSeniority(deal: Deal): {
    severity: ValidationSeverity;
    title: string;
    description: string;
  } | null {
    const LARGE_DEAL_THRESHOLD = 5000000; // $50k
    const VERY_LARGE_DEAL_THRESHOLD = 10000000; // $100k

    if (deal.amount < LARGE_DEAL_THRESHOLD) {
      return null;
    }

    // Count senior contacts
    const seniorContacts = deal.contacts.filter((c) => {
      const seniority = c.seniorityLevel || deriveSeniorityLevel(c.title);
      return ['c_level', 'vp', 'director'].includes(seniority);
    });

    const seniorContactCount = seniorContacts.length;

    // Check for no senior stakeholders
    if (seniorContactCount === 0) {
      return {
        severity: 'warning',
        title: 'No Senior Stakeholders',
        description: `Deal size ($${(deal.amount / 100).toLocaleString()}) typically requires senior stakeholder involvement. No VP, Director, or C-level contacts identified. Current contacts: ${deal.contacts.map((c) => c.title || 'Unknown').join(', ')}.`,
      };
    }

    // Check for very large deals without executive sponsor
    if (deal.amount > VERY_LARGE_DEAL_THRESHOLD) {
      const executiveContacts = deal.contacts.filter((c) => {
        const seniority = c.seniorityLevel || deriveSeniorityLevel(c.title);
        return ['c_level', 'vp'].includes(seniority);
      });

      if (executiveContacts.length === 0) {
        return {
          severity: 'info',
          title: 'No Executive Sponsor',
          description: `Deal size ($${(deal.amount / 100).toLocaleString()}) typically involves C-level or VP engagement. Consider identifying executive sponsor.`,
        };
      }
    }

    return null;
  }

  /**
   * Build ValidationResult with all data points
   */
  private buildResult(
    deal: Deal,
    severity: ValidationSeverity,
    title: string,
    description: string,
    contactCount: number,
    minimumExpected: number,
    healthyExpected: number,
    benchmarkSource: 'historical' | 'industry_fallback',
    confidence: ConfidenceLevel,
  ): ValidationResult {
    // Count senior contacts for data points
    const seniorContacts = deal.contacts.filter((c) => {
      const seniority = c.seniorityLevel || deriveSeniorityLevel(c.title);
      return ['c_level', 'vp', 'director'].includes(seniority);
    }).length;

    return {
      validatorId: this.id,
      dealId: deal.id,
      severity,
      title,
      description,
      confidence,
      dataPoints: {
        contactCount,
        minimumExpected,
        healthyExpected,
        dealAmount: deal.amount,
        currentStage: deal.stage.name,
        contacts: deal.contacts.map((c) => ({
          name: `${c.firstName} ${c.lastName}`,
          title: c.title || 'Unknown',
          seniority: c.seniorityLevel || deriveSeniorityLevel(c.title),
        })),
        seniorContacts,
        benchmarkSource,
      },
    };
  }
}
