import { Deal, DealStage, StageCategory, StageChange } from '@winnow/core';
import { ScenarioConfig, DealHealthStatus } from '../types';
import { uuid, randomInt, addDays, subtractDays, randomElement } from './utils';
import { generateDealName, generateOwnerName, generateCompanyName } from './names';
import { generateContacts } from './contacts';
import { generateActivities } from './contacts';

interface StageInfo {
  id: string;
  externalId: string;
  name: string;
  displayOrder: number;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
  category: StageCategory;
  pipelineId: string;
}

export function generateDeal(
  pipelineId: string,
  stages: StageInfo[],
  config: ScenarioConfig,
  healthStatus: DealHealthStatus,
  currentDate: Date
): Deal {
  // Filter out closed stages for active deals
  const activeStages = stages.filter(s => !s.isClosed);
  const stage = randomElement(activeStages);

  // Generate deal amount
  const amount = randomInt(config.dealParams.amountRange.min, config.dealParams.amountRange.max);

  // Generate creation date (30-120 days ago)
  const daysAgo = randomInt(30, 120);
  const createdAt = subtractDays(currentDate, daysAgo);

  // Generate deal
  const dealId = uuid();
  const companyName = generateCompanyName();
  const dealName = generateDealName(companyName);

  let closeDate: Date;
  let contacts: any[];
  let lastModifiedAt: Date;
  let stageHistory: StageChange[];
  let activities: any[];

  switch (healthStatus) {
    case 'healthy':
      ({ closeDate, contacts, lastModifiedAt, stageHistory, activities } = generateHealthyDeal(
        dealId,
        companyName,
        createdAt,
        currentDate,
        stage,
        stages,
        amount,
        config
      ));
      break;

    case 'unrealisticCloseDate':
      ({ closeDate, contacts, lastModifiedAt, stageHistory, activities } = generateUnrealisticCloseDateDeal(
        dealId,
        companyName,
        createdAt,
        currentDate,
        stage,
        stages,
        amount,
        config
      ));
      break;

    case 'missingBuyingCommittee':
      ({ closeDate, contacts, lastModifiedAt, stageHistory, activities } = generateMissingBuyingCommitteeDeal(
        dealId,
        companyName,
        createdAt,
        currentDate,
        stage,
        stages,
        amount,
        config
      ));
      break;

    case 'stale':
      ({ closeDate, contacts, lastModifiedAt, stageHistory, activities } = generateStaleDeal(
        dealId,
        companyName,
        createdAt,
        currentDate,
        stage,
        stages,
        amount,
        config
      ));
      break;
  }

  const dealStage: DealStage = {
    id: stage.id,
    name: stage.name,
    displayOrder: stage.displayOrder,
    probability: stage.probability,
    isClosed: stage.isClosed,
    isWon: stage.isWon,
  };

  return {
    id: dealId,
    externalId: `deal-${dealId}`,
    name: dealName,
    stage: dealStage,
    stageId: stage.id,
    amount,
    currency: 'USD',
    closeDate,
    createdAt,
    lastModifiedAt,
    ownerId: uuid(),
    ownerName: generateOwnerName(),
    pipelineId,
    contacts,
    activities,
    stageHistory,
  };
}

function generateHealthyDeal(
  dealId: string,
  companyName: string,
  createdAt: Date,
  currentDate: Date,
  stage: StageInfo,
  stages: StageInfo[],
  amount: number,
  _config: ScenarioConfig
) {
  // Healthy close date: reasonable time in the future based on stage
  const daysUntilClose = randomInt(30, 90);
  const closeDate = addDays(currentDate, daysUntilClose);

  // Appropriate contact count for deal size
  let contactCount: number;
  if (amount < 2000000) contactCount = randomInt(1, 2);
  else if (amount < 5000000) contactCount = randomInt(2, 3);
  else if (amount < 10000000) contactCount = randomInt(3, 5);
  else contactCount = randomInt(4, 6);

  const contacts = generateContacts(dealId, companyName, contactCount, createdAt, amount);

  // Recent activity
  const lastModifiedAt = subtractDays(currentDate, randomInt(0, 7));

  // Stage history showing progression
  const stageHistory = generateStageHistory(createdAt, currentDate, stage, stages);

  // Generate activities (not stale)
  const activities = generateActivities(createdAt, currentDate, stageHistory, false);

  return { closeDate, contacts, lastModifiedAt, stageHistory, activities };
}

function generateUnrealisticCloseDateDeal(
  dealId: string,
  companyName: string,
  createdAt: Date,
  currentDate: Date,
  stage: StageInfo,
  stages: StageInfo[],
  amount: number,
  config: ScenarioConfig
) {
  // Unrealistic close date: too soon for the stage
  const daysUntilClose = randomInt(3, 14);  // Very soon
  const closeDate = addDays(currentDate, daysUntilClose);

  // Normal contact count
  const contactCount = randomInt(config.dealParams.contactsRange.min, config.dealParams.contactsRange.max);
  const contacts = generateContacts(dealId, companyName, contactCount, createdAt, amount);

  const lastModifiedAt = subtractDays(currentDate, randomInt(0, 7));

  // Stage history with recent changes (might indicate pushed dates)
  const stageHistory = generateStageHistory(createdAt, currentDate, stage, stages);

  // Add some field_updated activities to show close date has been pushed
  const activities = generateActivities(createdAt, currentDate, stageHistory, false);

  return { closeDate, contacts, lastModifiedAt, stageHistory, activities };
}

function generateMissingBuyingCommitteeDeal(
  dealId: string,
  companyName: string,
  createdAt: Date,
  currentDate: Date,
  stage: StageInfo,
  stages: StageInfo[],
  amount: number,
  _config: ScenarioConfig
) {
  // Normal close date
  const daysUntilClose = randomInt(30, 90);
  const closeDate = addDays(currentDate, daysUntilClose);

  // Too few contacts for deal size
  const contactCount = 1;  // Single contact for large deal
  const contacts = generateContacts(dealId, companyName, contactCount, createdAt, amount);

  const lastModifiedAt = subtractDays(currentDate, randomInt(0, 7));

  const stageHistory = generateStageHistory(createdAt, currentDate, stage, stages);
  const activities = generateActivities(createdAt, currentDate, stageHistory, false);

  return { closeDate, contacts, lastModifiedAt, stageHistory, activities };
}

function generateStaleDeal(
  dealId: string,
  companyName: string,
  createdAt: Date,
  currentDate: Date,
  stage: StageInfo,
  stages: StageInfo[],
  amount: number,
  config: ScenarioConfig
) {
  // Normal close date
  const daysUntilClose = randomInt(30, 90);
  const closeDate = addDays(currentDate, daysUntilClose);

  // Normal contact count
  const contactCount = randomInt(config.dealParams.contactsRange.min, config.dealParams.contactsRange.max);
  const contacts = generateContacts(dealId, companyName, contactCount, createdAt, amount);

  // Last modified long ago, but after createdAt
  const daysSinceCreation = Math.floor((currentDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const maxDaysAgoForModified = Math.min(60, daysSinceCreation - 1);
  const daysAgoForModified = randomInt(14, Math.max(14, maxDaysAgoForModified));
  const lastModifiedAt = subtractDays(currentDate, daysAgoForModified);

  // Stage history showing deal has been in current stage for a long time
  // Ensure lastChangeDate is after createdAt but still stale (20+ days ago)
  const maxDaysAgo = Math.min(45, daysSinceCreation - 5); // Ensure it's after creation
  const daysAgo = randomInt(20, Math.max(20, maxDaysAgo));
  const lastChangeDate = subtractDays(currentDate, daysAgo);

  const stageHistory = generateStageHistory(createdAt, lastChangeDate, stage, stages);

  // Generate stale activities (no recent activity)
  const activities = generateActivities(createdAt, currentDate, stageHistory, true);

  return { closeDate, contacts, lastModifiedAt, stageHistory, activities };
}

function generateStageHistory(
  createdAt: Date,
  lastChangeDate: Date,
  currentStage: StageInfo,
  allStages: StageInfo[]
): StageChange[] {
  const history: StageChange[] = [];

  // Get stages up to current stage (in order)
  const currentStageIndex = currentStage.displayOrder;
  const previousStages = allStages
    .filter(s => !s.isClosed && s.displayOrder < currentStageIndex)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (previousStages.length === 0) {
    // Deal is in first stage, no history
    return [];
  }

  // Generate progression through stages
  const daysSinceCreation = Math.floor((lastChangeDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const stageCount = previousStages.length + 1;  // +1 for current stage
  const daysPerStage = Math.max(1, Math.floor(daysSinceCreation / stageCount));

  let currentDateMs = createdAt.getTime();
  const targetMs = lastChangeDate.getTime();

  for (let i = 0; i < previousStages.length; i++) {
    // Calculate a safe range for this stage to ensure we don't exceed lastChangeDate
    const minDays = Math.max(1, daysPerStage - 5);
    const maxDays = daysPerStage + 5;
    const daysInStage = randomInt(minDays, maxDays);

    // Ensure we don't go past the target date
    const potentialMs = currentDateMs + (daysInStage * 24 * 60 * 60 * 1000);
    currentDateMs = Math.min(potentialMs, targetMs - (previousStages.length - i) * 1000); // Leave room for remaining stages

    history.push({
      fromStage: i === 0 ? 'New' : previousStages[i - 1].name,
      toStage: previousStages[i].name,
      changedAt: new Date(currentDateMs),
    });
  }

  // Final change to current stage
  history.push({
    fromStage: previousStages[previousStages.length - 1].name,
    toStage: currentStage.name,
    changedAt: lastChangeDate,
  });

  return history;
}
