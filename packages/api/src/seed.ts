#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { generatePipeline } from '@winnow/mock-data';

const prisma = new PrismaClient();

async function main() {
  const scenarioName = process.argv[2] || 'mixed';

  console.log(`Seeding database with scenario: ${scenarioName}`);

  // Generate mock data
  const mockData = generatePipeline(scenarioName as any);

  // Insert organization
  const org = await prisma.organization.create({
    data: {
      id: mockData.organization.id,
      name: mockData.organization.name,
      crmType: mockData.organization.crmType,
      crmConnectedAt: mockData.organization.crmConnectedAt,
      createdAt: mockData.organization.createdAt,
    },
  });

  console.log(`✓ Created organization: ${org.name}`);

  // Insert pipeline
  const pipeline = await prisma.pipeline.create({
    data: {
      id: mockData.pipeline.id,
      externalId: mockData.pipeline.externalId,
      name: mockData.pipeline.name,
      organizationId: org.id,
    },
  });

  console.log(`✓ Created pipeline: ${pipeline.name}`);

  // Insert stages
  for (const stage of mockData.stages) {
    await prisma.stage.create({
      data: {
        id: stage.id,
        externalId: stage.externalId,
        name: stage.name,
        displayOrder: stage.displayOrder,
        probability: stage.probability,
        isClosed: stage.isClosed,
        isWon: stage.isWon,
        category: stage.category,
        pipelineId: pipeline.id,
      },
    });
  }

  console.log(`✓ Created ${mockData.stages.length} stages`);

  // Insert deals with contacts, activities, and stage history
  let dealCount = 0;
  let contactCount = 0;
  let activityCount = 0;
  let historyCount = 0;

  for (const deal of mockData.deals) {
    await prisma.deal.create({
      data: {
        id: deal.id,
        externalId: deal.externalId,
        name: deal.name,
        amount: deal.amount,
        currency: deal.currency,
        closeDate: deal.closeDate,
        createdAt: deal.createdAt,
        lastModifiedAt: deal.lastModifiedAt,
        ownerId: deal.ownerId,
        ownerName: deal.ownerName,
        stageId: deal.stageId,
        pipelineId: pipeline.id,
        contacts: {
          create: deal.contacts.map((c) => ({
            id: c.id,
            externalId: c.externalId,
            email: c.email,
            firstName: c.firstName,
            lastName: c.lastName,
            title: c.title,
            seniorityLevel: c.seniorityLevel,
            role: c.role,
            addedAt: c.addedAt,
          })),
        },
        activities: {
          create: deal.activities.map((a) => ({
            id: a.id,
            type: a.type,
            timestamp: a.timestamp,
            description: a.description,
          })),
        },
        stageHistory: {
          create: deal.stageHistory.map((h) => ({
            id: `${deal.id}-sh-${historyCount++}`,
            fromStage: h.fromStage,
            toStage: h.toStage,
            changedAt: h.changedAt,
          })),
        },
      },
    });

    dealCount++;
    contactCount += deal.contacts.length;
    activityCount += deal.activities.length;
    historyCount += deal.stageHistory.length;
  }

  console.log(`✓ Created ${dealCount} deals`);
  console.log(`✓ Created ${contactCount} contacts`);
  console.log(`✓ Created ${activityCount} activities`);
  console.log(`✓ Created ${historyCount} stage history records`);

  // Insert closed-won historical deals for benchmarks
  if (mockData.closedWonDeals && mockData.closedWonDeals.length > 0) {
    let closedCount = 0;

    for (const closedDeal of mockData.closedWonDeals) {
      // Find a closed-won stage
      const closedWonStage = mockData.stages.find((s) => s.isClosed && s.isWon);
      if (!closedWonStage) {
        console.warn('No closed-won stage found, skipping historical deals');
        break;
      }

      await prisma.deal.create({
        data: {
          id: closedDeal.id,
          externalId: closedDeal.externalId,
          name: closedDeal.name,
          amount: closedDeal.amount,
          currency: closedDeal.currency,
          closeDate: closedDeal.closeDate,
          createdAt: closedDeal.createdAt,
          lastModifiedAt: closedDeal.lastModifiedAt,
          ownerId: closedDeal.ownerId,
          ownerName: closedDeal.ownerName,
          stageId: closedWonStage.id,
          pipelineId: pipeline.id,
          contacts: {
            create: closedDeal.contacts.map((c) => ({
              id: c.id,
              externalId: c.externalId,
              email: c.email,
              firstName: c.firstName,
              lastName: c.lastName,
              title: c.title,
              seniorityLevel: c.seniorityLevel,
              role: c.role,
              addedAt: c.addedAt,
            })),
          },
          activities: {
            create: closedDeal.activities.map((a) => ({
              id: a.id,
              type: a.type,
              timestamp: a.timestamp,
              description: a.description,
            })),
          },
          stageHistory: {
            create: closedDeal.stageHistory.map((h, hi) => ({
              id: `${closedDeal.id}-sh-${hi}`,
              fromStage: h.fromStage,
              toStage: h.toStage,
              changedAt: h.changedAt,
            })),
          },
        },
      });

      closedCount++;
    }

    console.log(`✓ Created ${closedCount} historical closed-won deals for benchmarks`);
  }

  console.log('\n✅ Database seeded successfully!');
  console.log(`\nPipeline ID: ${pipeline.id}`);
  console.log('You can now run validation with: POST /api/validate { "pipelineId": "<id>" }');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
