import { MissingBuyingCommitteeValidator } from '../src/validators/missing-buying-committee.validator';
import {
  Deal,
  DealContact,
  ValidationContext,
  BenchmarkMetadata,
  StageMapping,
  ContactSegment,
} from '../src/types';

describe('MissingBuyingCommitteeValidator', () => {
  let validator: MissingBuyingCommitteeValidator;
  let currentDate: Date;
  let stageMappings: StageMapping[];

  beforeEach(() => {
    validator = new MissingBuyingCommitteeValidator();
    currentDate = new Date('2024-03-15');

    stageMappings = [
      { stageId: 'qual', stageName: 'Qualification', category: 'qualification' },
      {
        stageId: 'eval',
        stageName: 'Evaluation',
        category: 'evaluation',
      },
      { stageId: 'prop', stageName: 'Proposal', category: 'proposal' },
      { stageId: 'close', stageName: 'Closing', category: 'closing' },
      {
        stageId: 'won',
        stageName: 'Closed Won',
        category: 'closed_won',
      },
      {
        stageId: 'lost',
        stageName: 'Closed Lost',
        category: 'closed_lost',
      },
    ];
  });

  // Helper functions
  function createDeal(overrides: Partial<Deal> = {}): Deal {
    return {
      id: 'deal-1',
      externalId: 'ext-1',
      name: 'Test Deal',
      stage: {
        id: 'eval',
        name: 'Evaluation',
        displayOrder: 1,
        probability: 40,
        isClosed: false,
        isWon: false,
      },
      stageId: 'eval',
      amount: 3000000, // $30k
      currency: 'USD',
      closeDate: new Date('2024-04-15'),
      createdAt: new Date('2024-01-15'),
      lastModifiedAt: new Date('2024-03-10'),
      ownerId: 'owner-1',
      ownerName: 'John Doe',
      pipelineId: 'pipeline-1',
      contacts: [],
      activities: [],
      stageHistory: [],
      ...overrides,
    };
  }

  function createContact(overrides: Partial<DealContact> = {}): DealContact {
    return {
      id: 'contact-1',
      externalId: 'ext-contact-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Smith',
      title: 'Software Engineer',
      seniorityLevel: 'individual',
      role: null,
      addedAt: new Date('2024-01-20'),
      ...overrides,
    };
  }

  function createBenchmarks(
    overrides: Partial<BenchmarkMetadata> = {},
  ): BenchmarkMetadata {
    const contactCountBySegment: ContactSegment[] = [
      {
        minAmount: 0,
        maxAmount: 2000000, // $20k
        medianContacts: 2,
        p25Contacts: 1,
        dealCount: 30,
      },
      {
        minAmount: 2000000,
        maxAmount: 5000000, // $20k-$50k
        medianContacts: 3,
        p25Contacts: 2,
        dealCount: 25,
      },
      {
        minAmount: 5000000,
        maxAmount: 10000000, // $50k-$100k
        medianContacts: 5,
        p25Contacts: 3,
        dealCount: 20,
      },
      {
        minAmount: 10000000,
        maxAmount: Infinity, // $100k+
        medianContacts: 7,
        p25Contacts: 4,
        dealCount: 15,
      },
    ];

    return {
      closedWonDealsAnalyzed: 90,
      medianCycleLength: 75,
      cycleLengthBySegment: [],
      stageDistribution: [],
      contactCountBySegment,
      confidence: 'high',
      message: null,
      ...overrides,
    };
  }

  function createContext(
    benchmarks: BenchmarkMetadata = createBenchmarks(),
  ): ValidationContext {
    return {
      benchmarks,
      stageMappings,
      currentDate,
    };
  }

  describe('basic validation', () => {
    it('should have correct metadata', () => {
      expect(validator.id).toBe('missing_buying_committee');
      expect(validator.name).toBe('Missing Buying Committee');
      expect(validator.description).toBeTruthy();
    });
  });

  describe('closed deals', () => {
    it('should skip closed-won deals', () => {
      const deal = createDeal({
        stageId: 'won',
        stage: {
          id: 'won',
          name: 'Closed Won',
          displayOrder: 5,
          probability: 100,
          isClosed: true,
          isWon: true,
        },
        contacts: [], // No contacts, but should still skip
      });

      const result = validator.validate(deal, createContext());
      expect(result).toBeNull();
    });

    it('should skip closed-lost deals', () => {
      const deal = createDeal({
        stageId: 'lost',
        stage: {
          id: 'lost',
          name: 'Closed Lost',
          displayOrder: 6,
          probability: 0,
          isClosed: true,
          isWon: false,
        },
        contacts: [], // No contacts, but should still skip
      });

      const result = validator.validate(deal, createContext());
      expect(result).toBeNull();
    });
  });

  describe('qualification stage', () => {
    it('should skip deals in qualification stage', () => {
      const deal = createDeal({
        stageId: 'qual',
        stage: {
          id: 'qual',
          name: 'Qualification',
          displayOrder: 0,
          probability: 20,
          isClosed: false,
          isWon: false,
        },
        amount: 8000000, // $80k
        contacts: [createContact()], // Only 1 contact
      });

      const result = validator.validate(deal, createContext());
      expect(result).toBeNull();
    });
  });

  describe('Test Scenario 1: Passes - adequate contacts', () => {
    it('should pass $30k deal in proposal with 3 contacts when benchmark p25 = 2', () => {
      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 3000000, // $30k
        contacts: [
          createContact({ id: 'c1' }),
          createContact({ id: 'c2' }),
          createContact({ id: 'c3' }),
        ],
      });

      const result = validator.validate(deal, createContext());
      expect(result).toBeNull();
    });
  });

  describe('Test Scenario 2: Error - single contact on large deal', () => {
    it('should flag $80k deal in proposal with 1 contact when benchmark p25 = 3', () => {
      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 8000000, // $80k
        contacts: [createContact()],
      });

      const result = validator.validate(deal, createContext());
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('error');
      expect(result?.title).toBe('Missing Buying Committee');
      expect(result?.description).toContain('only 1 contact');
      expect(result?.dataPoints.contactCount).toBe(1);
      expect(result?.dataPoints.minimumExpected).toBe(3);
      expect(result?.dataPoints.healthyExpected).toBe(5);
    });
  });

  describe('Test Scenario 3: Warning - below median', () => {
    it('should flag $40k deal in evaluation with 2 contacts when p25=2, median=3', () => {
      const deal = createDeal({
        stageId: 'eval',
        stage: {
          id: 'eval',
          name: 'Evaluation',
          displayOrder: 1,
          probability: 40,
          isClosed: false,
          isWon: false,
        },
        amount: 4000000, // $40k
        contacts: [createContact({ id: 'c1' }), createContact({ id: 'c2' })],
      });

      const result = validator.validate(deal, createContext());
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('warning');
      expect(result?.title).toBe('Thin Buying Committee');
      expect(result?.description).toContain('2 contacts');
      expect(result?.description).toContain('typically have 3+');
      expect(result?.dataPoints.contactCount).toBe(2);
      expect(result?.dataPoints.minimumExpected).toBe(2);
      expect(result?.dataPoints.healthyExpected).toBe(3);
    });
  });

  describe('Test Scenario 6: Seniority warning', () => {
    it('should warn about no senior stakeholders in $120k deal with enough junior contacts', () => {
      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 12000000, // $120k
        contacts: [
          createContact({
            id: 'c1',
            title: 'Software Engineer',
            seniorityLevel: 'individual',
          }),
          createContact({
            id: 'c2',
            title: 'Marketing Specialist',
            seniorityLevel: 'individual',
          }),
          createContact({
            id: 'c3',
            title: 'Analyst',
            seniorityLevel: 'individual',
          }),
          createContact({
            id: 'c4',
            title: 'Account Executive',
            seniorityLevel: 'individual',
          }),
          createContact({
            id: 'c5',
            title: 'Sales Representative',
            seniorityLevel: 'individual',
          }),
          createContact({
            id: 'c6',
            title: 'Product Specialist',
            seniorityLevel: 'individual',
          }),
          createContact({
            id: 'c7',
            title: 'Solutions Architect',
            seniorityLevel: 'individual',
          }),
        ],
      });

      const result = validator.validate(deal, createContext());
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('warning');
      expect(result?.title).toBe('No Senior Stakeholders');
      expect(result?.description).toContain(
        'typically requires senior stakeholder involvement',
      );
      expect(result?.dataPoints.seniorContacts).toBe(0);
    });

    it('should pass when large deal has enough contacts with senior stakeholders', () => {
      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 12000000, // $120k
        contacts: [
          createContact({
            id: 'c1',
            title: 'VP of Engineering',
            seniorityLevel: 'vp',
          }),
          createContact({
            id: 'c2',
            title: 'Director of IT',
            seniorityLevel: 'director',
          }),
          createContact({
            id: 'c3',
            title: 'Software Engineer',
            seniorityLevel: 'individual',
          }),
          createContact({
            id: 'c4',
            title: 'CTO',
            seniorityLevel: 'c_level',
          }),
          createContact({
            id: 'c5',
            title: 'Product Manager',
            seniorityLevel: 'manager',
          }),
          createContact({
            id: 'c6',
            title: 'Engineering Manager',
            seniorityLevel: 'manager',
          }),
          createContact({
            id: 'c7',
            title: 'Marketing Specialist',
            seniorityLevel: 'individual',
          }),
        ],
      });

      const result = validator.validate(deal, createContext());
      expect(result).toBeNull();
    });

    it('should suggest executive sponsor for very large deals without C-level/VP', () => {
      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 15000000, // $150k
        contacts: [
          createContact({
            id: 'c1',
            title: 'Director of IT',
            seniorityLevel: 'director',
          }),
          createContact({
            id: 'c2',
            title: 'Engineering Manager',
            seniorityLevel: 'manager',
          }),
          createContact({
            id: 'c3',
            title: 'Software Engineer',
            seniorityLevel: 'individual',
          }),
          createContact({
            id: 'c4',
            title: 'Product Manager',
            seniorityLevel: 'manager',
          }),
          createContact({
            id: 'c5',
            title: 'Senior Director',
            seniorityLevel: 'director',
          }),
          createContact({
            id: 'c6',
            title: 'IT Manager',
            seniorityLevel: 'manager',
          }),
          createContact({
            id: 'c7',
            title: 'Solutions Architect',
            seniorityLevel: 'individual',
          }),
        ],
      });

      const result = validator.validate(deal, createContext());
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('info');
      expect(result?.title).toBe('No Executive Sponsor');
      expect(result?.description).toContain('C-level or VP engagement');
    });
  });

  describe('Test Scenario 7: Industry fallback', () => {
    it('should use fallback thresholds when no benchmark data', () => {
      const benchmarks = createBenchmarks({
        confidence: 'low',
        contactCountBySegment: [],
      });

      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 6000000, // $60k
        contacts: [createContact()],
      });

      const result = validator.validate(deal, createContext(benchmarks));
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('error');
      expect(result?.dataPoints.benchmarkSource).toBe('industry_fallback');
      expect(result?.confidence).toBe('low');
    });
  });

  describe('edge cases', () => {
    it('should handle deal with unknown stage mapping', () => {
      const deal = createDeal({
        stageId: 'unknown-stage',
        contacts: [createContact()],
      });

      const result = validator.validate(deal, createContext());
      expect(result).toBeNull();
    });

    it('should handle contacts without title by deriving seniority', () => {
      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 8000000, // $80k
        contacts: [
          createContact({ id: 'c1', title: null, seniorityLevel: null }),
          createContact({
            id: 'c2',
            title: 'VP of Sales',
            seniorityLevel: null,
          }), // Will derive 'vp'
          createContact({
            id: 'c3',
            title: 'Director',
            seniorityLevel: null,
          }), // Will derive 'director'
          createContact({
            id: 'c4',
            title: 'Engineering Manager',
            seniorityLevel: null,
          }),
          createContact({
            id: 'c5',
            title: 'CEO',
            seniorityLevel: null,
          }), // Will derive 'c_level'
        ],
      });

      const result = validator.validate(deal, createContext());
      expect(result).toBeNull(); // Has 5 contacts which meets median=5 for this segment
    });

    it('should prioritize primary issue (count) over seniority issue', () => {
      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 8000000, // $80k
        contacts: [
          createContact({
            id: 'c1',
            title: 'Software Engineer',
            seniorityLevel: 'individual',
          }),
        ], // Too few contacts AND no senior stakeholders
      });

      const result = validator.validate(deal, createContext());
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('error'); // Count issue is error, seniority would be warning
      expect(result?.title).toBe('Missing Buying Committee');
    });

    it('should handle segment with insufficient data by falling back', () => {
      const benchmarks = createBenchmarks({
        contactCountBySegment: [
          {
            minAmount: 0,
            maxAmount: 2000000,
            medianContacts: 2,
            p25Contacts: 1,
            dealCount: 3, // < 5 deals, should use fallback
          },
        ],
      });

      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 1000000, // $10k
        contacts: [],
      });

      const result = validator.validate(deal, createContext(benchmarks));
      expect(result).not.toBeNull();
      expect(result?.dataPoints.benchmarkSource).toBe('industry_fallback');
    });
  });

  describe('data points validation', () => {
    it('should include all required data points', () => {
      const deal = createDeal({
        stageId: 'prop',
        stage: {
          id: 'prop',
          name: 'Proposal',
          displayOrder: 2,
          probability: 60,
          isClosed: false,
          isWon: false,
        },
        amount: 8000000, // $80k
        contacts: [
          createContact({
            firstName: 'John',
            lastName: 'Doe',
            title: 'VP of Sales',
          }),
        ],
      });

      const result = validator.validate(deal, createContext());
      expect(result).not.toBeNull();

      const dataPoints = result!.dataPoints;
      expect(dataPoints).toHaveProperty('contactCount');
      expect(dataPoints).toHaveProperty('minimumExpected');
      expect(dataPoints).toHaveProperty('healthyExpected');
      expect(dataPoints).toHaveProperty('dealAmount');
      expect(dataPoints).toHaveProperty('currentStage');
      expect(dataPoints).toHaveProperty('contacts');
      expect(dataPoints).toHaveProperty('seniorContacts');
      expect(dataPoints).toHaveProperty('benchmarkSource');

      // Verify contacts structure
      expect(Array.isArray(dataPoints.contacts)).toBe(true);
      expect(dataPoints.contacts[0]).toHaveProperty('name');
      expect(dataPoints.contacts[0]).toHaveProperty('title');
      expect(dataPoints.contacts[0]).toHaveProperty('seniority');
      expect(dataPoints.contacts[0].name).toBe('John Doe');
    });
  });
});
