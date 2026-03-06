import { Deal, DealStage, StageChange } from '@winnow/core';
import { ScenarioConfig } from '../types';
import { uuid, randomInt, addDays, subtractDays } from './utils';
import { generateDealName, generateOwnerName, generateCompanyName } from './names';
import { generateContacts, generateActivities } from './contacts';

interface StageInfo {
  id: string;
  externalId: string;
  name: string;
  displayOrder: number;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
  category: string;
  pipelineId: string;
}

export function generateClosedWonDeal(
  pipelineId: string,
  stages: StageInfo[],
  config: ScenarioConfig,
  currentDate: Date
): Deal {
  // Find the closed-won stage
  const closedWonStage = stages.find(s => s.isWon && s.isClosed);
  if (!closedWonStage) {
    throw new Error('No closed-won stage found in pipeline');
  }

  // Generate closed date within last 12 months
  const daysAgo = randomInt(30, 365);
  const closedAt = subtractDays(currentDate, daysAgo);

  // Generate cycle length
  const cycleLengthDays = randomInt(config.dealParams.cycleLengthRange.min, config.dealParams.cycleLengthRange.max);
  const createdAt = subtractDays(closedAt, cycleLengthDays);

  // Generate deal amount
  const amount = randomInt(config.dealParams.amountRange.min, config.dealParams.amountRange.max);

  // Generate appropriate contact count for deal size
  let contactCount: number;
  if (amount < 2000000) contactCount = randomInt(1, 2);
  else if (amount < 5000000) contactCount = randomInt(2, 4);
  else if (amount < 10000000) contactCount = randomInt(3, 5);
  else contactCount = randomInt(4, 7);

  const dealId = uuid();
  const companyName = generateCompanyName();
  const dealName = generateDealName(companyName);

  // Generate contacts
  const contacts = generateContacts(dealId, companyName, contactCount, createdAt, amount);

  // Generate complete stage history (progression through all stages)
  const stageHistory = generateCompleteStageHistory(createdAt, closedAt, closedWonStage, stages, cycleLengthDays);

  // Generate activities
  const activities = generateActivities(createdAt, closedAt, stageHistory, false);

  const dealStage: DealStage = {
    id: closedWonStage.id,
    name: closedWonStage.name,
    displayOrder: closedWonStage.displayOrder,
    probability: closedWonStage.probability,
    isClosed: closedWonStage.isClosed,
    isWon: closedWonStage.isWon,
  };

  return {
    id: dealId,
    externalId: `deal-${dealId}`,
    name: dealName,
    stage: dealStage,
    stageId: closedWonStage.id,
    amount,
    currency: 'USD',
    closeDate: closedAt,
    createdAt,
    lastModifiedAt: closedAt,
    ownerId: uuid(),
    ownerName: generateOwnerName(),
    pipelineId,
    contacts,
    activities,
    stageHistory,
  };
}

function generateCompleteStageHistory(
  createdAt: Date,
  closedAt: Date,
  closedWonStage: StageInfo,
  allStages: StageInfo[],
  totalCycleDays: number
): StageChange[] {
  const history: StageChange[] = [];

  // Get all active stages leading to closed-won
  const activeStages = allStages
    .filter(s => !s.isClosed)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (activeStages.length === 0) {
    return [{
      fromStage: 'New',
      toStage: closedWonStage.name,
      changedAt: closedAt,
    }];
  }

  // Distribute time across stages
  // Early stages get more time (qualification/evaluation)
  // Later stages get less time (proposal/closing)
  const stageTimeDistribution = [0.25, 0.30, 0.25, 0.20];  // Percentages

  let currentDate = createdAt;

  for (let i = 0; i < activeStages.length; i++) {
    // Calculate days for this stage
    const percentage = stageTimeDistribution[i % stageTimeDistribution.length] || 0.25;
    const daysInStage = Math.max(1, Math.floor(totalCycleDays * percentage));

    currentDate = addDays(currentDate, daysInStage);

    history.push({
      fromStage: i === 0 ? 'New' : activeStages[i - 1].name,
      toStage: activeStages[i].name,
      changedAt: currentDate,
    });
  }

  // Final change to closed-won
  history.push({
    fromStage: activeStages[activeStages.length - 1].name,
    toStage: closedWonStage.name,
    changedAt: closedAt,
  });

  return history;
}
