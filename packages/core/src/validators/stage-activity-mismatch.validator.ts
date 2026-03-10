import {
  Deal,
  ValidationResult,
  ValidatorId,
  ValidationSeverity,
  StageCategory,
  ActivityType,
} from '../types';
import { Validator, ValidationContext } from '../engine/validator.interface';

const MEANINGFUL_ACTIVITY_TYPES: ActivityType[] = [
  'stage_change',
  'contact_added',
  'task_created',
  'task_completed',
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const BRAND_NEW_DEAL_DAYS = 3;

/** Stage-specific staleness thresholds: warning (days), error (days) */
const STALENESS_THRESHOLDS: Record<
  StageCategory,
  { warning: number; error: number }
> = {
  qualification: { warning: 21, error: 35 },
  evaluation: { warning: 14, error: 28 },
  proposal: { warning: 10, error: 21 },
  closing: { warning: 7, error: 14 },
  closed_won: { warning: 0, error: 0 },
  closed_lost: { warning: 0, error: 0 },
};

/**
 * Stage-Activity Mismatch Validator
 *
 * Flags deals in active stages that show no meaningful CRM activity for an extended period.
 * Uses stage-specific staleness thresholds. Only considers structural CRM events
 * (stage_change, contact_added, task_created, task_completed); ignores field_updated and note_created.
 */
export class StageActivityMismatchValidator implements Validator {
  readonly id: ValidatorId = 'stage_activity_mismatch';
  readonly name = 'Stage-Activity Mismatch';
  readonly description =
    'Flags deals in active stages with no meaningful CRM activity for an extended period';

  validate(deal: Deal, context: ValidationContext): ValidationResult | null {
    if (deal.stage.isClosed) {
      return null;
    }

    const stageMapping = context.stageMappings.find(
      (m) => m.stageId === deal.stageId || m.stageName === deal.stage.name
    );
    const stageCategory = stageMapping?.category ?? 'qualification';

    if (stageCategory === 'closed_won' || stageCategory === 'closed_lost') {
      return null;
    }

    const { currentDate } = context;

    const lastMeaningfulActivity = this.getLastMeaningfulActivity(deal);
    const stageEnteredDate = this.getStageEnteredDate(deal);

    const daysSinceActivity = Math.floor(
      (currentDate.getTime() - lastMeaningfulActivity.getTime()) / MS_PER_DAY
    );
    const daysInCurrentStage = stageEnteredDate
      ? Math.floor(
          (currentDate.getTime() - stageEnteredDate.getTime()) / MS_PER_DAY
        )
      : 0;

    const lastActivity = this.getLastMeaningfulActivityDetails(deal);

    const daysSinceCreation = Math.floor(
      (currentDate.getTime() - deal.createdAt.getTime()) / MS_PER_DAY
    );
    if (daysSinceCreation < BRAND_NEW_DEAL_DAYS) {
      return null;
    }

    const threshold = STALENESS_THRESHOLDS[stageCategory];
    if (threshold.warning === 0) {
      return null;
    }

    let severity: ValidationSeverity | null = null;
    if (daysSinceActivity >= threshold.error) {
      severity = 'error';
    } else if (daysSinceActivity >= threshold.warning) {
      severity = 'warning';
    }

    if (!severity) {
      return null;
    }

    const lastActivityDesc = lastActivity
      ? `${lastActivity.type} on ${this.formatDate(lastActivity.timestamp)}`
      : 'none recorded';

    const description = `No meaningful activity for ${daysSinceActivity} days. Deal has been in ${deal.stage.name} since ${stageEnteredDate ? this.formatDate(stageEnteredDate) : 'creation'}. Last activity: ${lastActivityDesc}.`;

    return {
      validatorId: this.id,
      dealId: deal.id,
      severity,
      title: 'Stale Pipeline Activity',
      description,
      confidence: 'high',
      dataPoints: {
        daysSinceActivity,
        lastActivityDate: lastActivity?.timestamp ?? null,
        lastActivityType: lastActivity?.type ?? null,
        currentStage: deal.stage.name,
        stageCategory,
        stageEnteredDate,
        daysInCurrentStage,
        threshold: { warning: threshold.warning, error: threshold.error },
      },
    };
  }

  private getLastMeaningfulActivity(deal: Deal): Date {
    const meaningful = deal.activities.filter((a) =>
      MEANINGFUL_ACTIVITY_TYPES.includes(a.type)
    );
    if (meaningful.length === 0) {
      return deal.createdAt;
    }
    let latest = meaningful[0].timestamp;
    for (const a of meaningful) {
      const t = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      if (t > (latest instanceof Date ? latest.getTime() : new Date(latest).getTime())) {
        latest = a.timestamp;
      }
    }
    return latest instanceof Date ? latest : new Date(latest);
  }

  private getLastMeaningfulActivityDetails(
    deal: Deal
  ): { type: string; timestamp: Date } | null {
    const meaningful = deal.activities.filter((a) =>
      MEANINGFUL_ACTIVITY_TYPES.includes(a.type)
    );
    if (meaningful.length === 0) {
      return null;
    }
    let best = meaningful[0];
    for (const a of meaningful) {
      const t = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const bestT = best.timestamp instanceof Date ? best.timestamp.getTime() : new Date(best.timestamp).getTime();
      if (t > bestT) best = a;
    }
    const timestamp =
      best.timestamp instanceof Date
        ? best.timestamp
        : new Date(best.timestamp);
    return { type: best.type, timestamp };
  }

  private getStageEnteredDate(deal: Deal): Date | null {
    if (!deal.stageHistory || deal.stageHistory.length === 0) {
      return null;
    }
    const currentStageId = deal.stageId;
    const currentStageName = deal.stage.name;
    const entries = deal.stageHistory.filter(
      (h) => h.toStage === currentStageId || h.toStage === currentStageName
    );
    if (entries.length === 0) {
      return null;
    }
    let latest = entries[0].changedAt;
    for (const h of entries) {
      const t = h.changedAt instanceof Date ? h.changedAt.getTime() : new Date(h.changedAt).getTime();
      if (t > (latest instanceof Date ? latest.getTime() : new Date(latest).getTime())) {
        latest = h.changedAt;
      }
    }
    return latest instanceof Date ? latest : new Date(latest);
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
