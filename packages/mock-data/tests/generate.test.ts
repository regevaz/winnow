import { generatePipeline, SCENARIOS, getScenario } from '../src';
import { deriveSeniorityLevel } from '../src/generators/utils';

describe('Mock Data Generator', () => {
  describe('generatePipeline', () => {
    it('should generate a complete pipeline with all required fields', () => {
      const data = generatePipeline('healthy');

      expect(data).toHaveProperty('organization');
      expect(data).toHaveProperty('pipeline');
      expect(data).toHaveProperty('stages');
      expect(data).toHaveProperty('deals');
      expect(data).toHaveProperty('closedWonDeals');

      // Organization
      expect(data.organization).toHaveProperty('id');
      expect(data.organization).toHaveProperty('name');
      expect(data.organization.crmType).toBe('hubspot');

      // Pipeline
      expect(data.pipeline).toHaveProperty('id');
      expect(data.pipeline).toHaveProperty('externalId');
      expect(data.pipeline.organizationId).toBe(data.organization.id);

      // Stages
      expect(data.stages.length).toBeGreaterThan(0);
      expect(data.stages[0]).toHaveProperty('id');
      expect(data.stages[0]).toHaveProperty('name');
      expect(data.stages[0]).toHaveProperty('category');
    });

    it('should generate the correct number of deals', () => {
      const scenario = getScenario('healthy');
      const data = generatePipeline('healthy');

      expect(data.deals.length).toBe(scenario.dealCount);
    });

    it('should generate the correct number of closed-won deals', () => {
      const scenario = getScenario('healthy');
      const data = generatePipeline('healthy');

      expect(data.closedWonDeals.length).toBe(scenario.closedWonCount);
    });

    it('should allow overriding deal count', () => {
      const data = generatePipeline('healthy', { dealCount: 10 });

      expect(data.deals.length).toBe(10);
    });
  });

  describe('Deal Data Consistency', () => {
    const data = generatePipeline('mixed');

    it('should have valid deal structure', () => {
      for (const deal of data.deals) {
        expect(deal).toHaveProperty('id');
        expect(deal).toHaveProperty('externalId');
        expect(deal).toHaveProperty('name');
        expect(deal).toHaveProperty('stage');
        expect(deal).toHaveProperty('amount');
        expect(deal.amount).toBeGreaterThan(0);
        expect(deal.currency).toBe('USD');
        expect(deal).toHaveProperty('closeDate');
        expect(deal).toHaveProperty('createdAt');
        expect(deal).toHaveProperty('contacts');
        expect(deal).toHaveProperty('activities');
        expect(deal).toHaveProperty('stageHistory');
      }
    });

    it('should have chronologically valid dates', () => {
      for (const deal of data.deals) {
        // createdAt should be before closeDate
        expect(deal.createdAt.getTime()).toBeLessThan(deal.closeDate.getTime());

        // lastModifiedAt should be after createdAt
        expect(deal.lastModifiedAt.getTime()).toBeGreaterThanOrEqual(deal.createdAt.getTime());

        // Contacts should be added after deal creation
        for (const contact of deal.contacts) {
          expect(contact.addedAt.getTime()).toBeGreaterThanOrEqual(deal.createdAt.getTime());
        }

        // Activities should be after deal creation
        for (const activity of deal.activities) {
          expect(activity.timestamp.getTime()).toBeGreaterThanOrEqual(deal.createdAt.getTime());
        }
      }
    });

    it('should have chronologically consistent stage history', () => {
      for (const deal of data.deals) {
        const history = deal.stageHistory;

        if (history.length === 0) continue;

        // All stage changes should be after deal creation
        for (const change of history) {
          expect(change.changedAt.getTime()).toBeGreaterThanOrEqual(deal.createdAt.getTime());
        }

        // Stage changes should be in chronological order
        for (let i = 1; i < history.length; i++) {
          expect(history[i].changedAt.getTime()).toBeGreaterThanOrEqual(history[i - 1].changedAt.getTime());
        }

        // Last stage change should match current stage
        const lastChange = history[history.length - 1];
        expect(lastChange.toStage).toBe(deal.stage.name);
      }
    });

    it('should have valid contact data', () => {
      for (const deal of data.deals) {
        expect(deal.contacts.length).toBeGreaterThan(0);

        for (const contact of deal.contacts) {
          expect(contact).toHaveProperty('id');
          expect(contact).toHaveProperty('email');
          expect(contact.email).toContain('@');
          expect(contact).toHaveProperty('firstName');
          expect(contact).toHaveProperty('lastName');
          expect(contact.firstName.length).toBeGreaterThan(0);
          expect(contact.lastName.length).toBeGreaterThan(0);

          // Seniority level should match title
          if (contact.title) {
            const expectedSeniority = deriveSeniorityLevel(contact.title);
            expect(contact.seniorityLevel).toBe(expectedSeniority);
          }
        }
      }
    });

    it('should have valid activity types', () => {
      const validActivityTypes = ['stage_change', 'contact_added', 'note_created', 'task_created', 'task_completed', 'field_updated'];

      for (const deal of data.deals) {
        for (const activity of deal.activities) {
          expect(validActivityTypes).toContain(activity.type);
          expect(activity).toHaveProperty('timestamp');
          expect(activity.timestamp).toBeInstanceOf(Date);
        }
      }
    });
  });

  describe('Closed-Won Deal Consistency', () => {
    const data = generatePipeline('mixed');

    it('should have all closed-won deals in won state', () => {
      for (const deal of data.closedWonDeals) {
        expect(deal.stage.isClosed).toBe(true);
        expect(deal.stage.isWon).toBe(true);
      }
    });

    it('should have complete stage history for closed deals', () => {
      for (const deal of data.closedWonDeals) {
        // Closed deals should have progressed through multiple stages
        expect(deal.stageHistory.length).toBeGreaterThan(0);

        // Close date should equal last modified date
        expect(deal.closeDate.getTime()).toBe(deal.lastModifiedAt.getTime());
      }
    });

    it('should have realistic contact counts for deal size', () => {
      for (const deal of data.closedWonDeals) {
        // Larger deals should have more contacts (generally)
        expect(deal.contacts.length).toBeGreaterThan(0);

        if (deal.amount > 10000000) {
          // $100k+ deals should have multiple contacts
          expect(deal.contacts.length).toBeGreaterThanOrEqual(3);
        }
      }
    });
  });

  describe('Seniority Level Derivation', () => {
    it('should correctly identify c-level titles', () => {
      expect(deriveSeniorityLevel('CEO')).toBe('c_level');
      expect(deriveSeniorityLevel('Chief Technology Officer')).toBe('c_level');
      expect(deriveSeniorityLevel('CTO')).toBe('c_level');
      expect(deriveSeniorityLevel('CFO')).toBe('c_level');
    });

    it('should correctly identify VP titles', () => {
      expect(deriveSeniorityLevel('VP of Sales')).toBe('vp');
      expect(deriveSeniorityLevel('Vice President of Engineering')).toBe('vp');
      expect(deriveSeniorityLevel('SVP Marketing')).toBe('vp');
      expect(deriveSeniorityLevel('EVP Operations')).toBe('vp');
    });

    it('should correctly identify director titles', () => {
      expect(deriveSeniorityLevel('Director of IT')).toBe('director');
      expect(deriveSeniorityLevel('Senior Director of Engineering')).toBe('director');
      expect(deriveSeniorityLevel('Sales Director')).toBe('director');
    });

    it('should correctly identify manager titles', () => {
      expect(deriveSeniorityLevel('Engineering Manager')).toBe('manager');
      expect(deriveSeniorityLevel('Head of DevOps')).toBe('manager');
      expect(deriveSeniorityLevel('Product Manager')).toBe('manager');
    });

    it('should correctly identify individual contributor titles', () => {
      expect(deriveSeniorityLevel('Software Engineer')).toBe('individual');
      expect(deriveSeniorityLevel('Account Executive')).toBe('individual');
      expect(deriveSeniorityLevel('Marketing Specialist')).toBe('individual');
    });

    it('should return unknown for null or empty title', () => {
      expect(deriveSeniorityLevel(null)).toBe('unknown');
      expect(deriveSeniorityLevel('')).toBe('unknown');
    });
  });

  describe('Scenarios', () => {
    it('should have all required scenarios', () => {
      expect(SCENARIOS).toHaveProperty('healthy');
      expect(SCENARIOS).toHaveProperty('problematic');
      expect(SCENARIOS).toHaveProperty('unrealistic-dates');
      expect(SCENARIOS).toHaveProperty('thin-committees');
      expect(SCENARIOS).toHaveProperty('stale-pipeline');
      expect(SCENARIOS).toHaveProperty('mixed');
    });

    it('should have valid distribution percentages', () => {
      for (const [name, scenario] of Object.entries(SCENARIOS)) {
        const total = scenario.distribution.healthy +
                     scenario.distribution.unrealisticCloseDate +
                     scenario.distribution.missingBuyingCommittee +
                     scenario.distribution.staleDeals;

        expect(total).toBe(100);
      }
    });

    it('should throw error for unknown scenario', () => {
      expect(() => getScenario('nonexistent')).toThrow();
    });
  });
});
