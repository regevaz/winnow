import { ScenarioConfig, GeneratedPipeline, DealHealthStatus } from './types';
import { SCENARIOS, getScenario, DEFAULT_SCENARIO } from './scenarios';
import { uuid } from './generators/utils';
import { generateDeal } from './generators/deals';
import { generateClosedWonDeal } from './generators/historical';

/**
 * Generate a complete pipeline dataset with organization, pipeline, stages, and deals
 */
export function generatePipeline(scenarioName?: string, overrides?: Partial<ScenarioConfig>): GeneratedPipeline {
  // Get scenario configuration
  const scenario = { ...getScenario(scenarioName || DEFAULT_SCENARIO), ...overrides };

  const currentDate = new Date();

  // Generate organization
  const organizationId = uuid();
  const organization = {
    id: organizationId,
    name: 'Demo Organization',
    crmType: 'hubspot',
    crmConnectedAt: new Date(),
    createdAt: new Date(),
  };

  // Generate pipeline
  const pipelineId = uuid();
  const pipeline = {
    id: pipelineId,
    externalId: `pipeline-${pipelineId}`,
    name: 'Sales Pipeline',
    organizationId,
  };

  // Generate stages
  const stages = scenario.pipeline.stages.map((stageConfig, index) => ({
    id: uuid(),
    externalId: `stage-${index}`,
    name: stageConfig.name,
    displayOrder: index,
    probability: stageConfig.probability,
    isClosed: stageConfig.category === 'closed_won' || stageConfig.category === 'closed_lost',
    isWon: stageConfig.category === 'closed_won',
    category: stageConfig.category,
    pipelineId,
  }));

  // Determine deal distribution
  const dealDistribution = calculateDealDistribution(scenario);

  // Generate deals
  const deals = [];
  for (const { healthStatus, count } of dealDistribution) {
    for (let i = 0; i < count; i++) {
      const deal = generateDeal(pipelineId, stages, scenario, healthStatus, currentDate);
      deals.push(deal);
    }
  }

  // Generate closed-won historical deals for benchmarks
  const closedWonDeals = [];
  for (let i = 0; i < scenario.closedWonCount; i++) {
    const closedDeal = generateClosedWonDeal(pipelineId, stages, scenario, currentDate);
    closedWonDeals.push(closedDeal);
  }

  return {
    organization,
    pipeline,
    stages,
    deals,
    closedWonDeals,
  };
}

function calculateDealDistribution(scenario: ScenarioConfig): { healthStatus: DealHealthStatus; count: number }[] {
  const { dealCount, distribution } = scenario;
  const total = distribution.healthy + distribution.unrealisticCloseDate + distribution.missingBuyingCommittee + distribution.staleDeals;

  if (total !== 100) {
    throw new Error(`Deal distribution must sum to 100%, got ${total}%`);
  }

  // Calculate counts using floor first, then distribute remainder
  const healthyCount = Math.floor(dealCount * distribution.healthy / 100);
  const unrealisticCount = Math.floor(dealCount * distribution.unrealisticCloseDate / 100);
  const missingCommitteeCount = Math.floor(dealCount * distribution.missingBuyingCommittee / 100);
  const staleCount = Math.floor(dealCount * distribution.staleDeals / 100);

  // Distribute remainder to ensure exact total
  let remainder = dealCount - (healthyCount + unrealisticCount + missingCommitteeCount + staleCount);
  const counts = [
    { healthStatus: 'healthy' as DealHealthStatus, count: healthyCount },
    { healthStatus: 'unrealisticCloseDate' as DealHealthStatus, count: unrealisticCount },
    { healthStatus: 'missingBuyingCommittee' as DealHealthStatus, count: missingCommitteeCount },
    { healthStatus: 'stale' as DealHealthStatus, count: staleCount },
  ];

  // Add remainder to the first categories
  for (let i = 0; i < counts.length && remainder > 0; i++) {
    counts[i].count++;
    remainder--;
  }

  return counts;
}

// Export scenarios for external use
export { SCENARIOS, getScenario, DEFAULT_SCENARIO };
export type { ScenarioConfig, GeneratedPipeline };

// Keep old generate function for backward compatibility
export function generate(): GeneratedPipeline {
  return generatePipeline();
}
