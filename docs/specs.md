# Winnow MVP — Implementation Specs

## Project Overview

Winnow is a Revenue Pipeline Validator. It connects to a CRM (starting with HubSpot), reads deal and contact data, and runs validation rules to detect pipeline inconsistencies. The MVP is CRM-only (no email/calendar integrations yet).

### Tech Stack

- **Backend:** NestJS (TypeScript)
- **Frontend:** React + Tailwind CSS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Testing:** Jest
- **Monorepo:** Turborepo
- **CI/CD:** GitHub Actions
- **Hosting:** Netlify (frontend), TBD (backend)

### Repository Structure

```
winnow/
├── turbo.json
├── package.json
├── packages/
│   ├── core/                    # Shared types, validation engine, business logic
│   │   ├── src/
│   │   │   ├── types/           # All shared TypeScript interfaces
│   │   │   ├── validators/      # Individual validation rule implementations
│   │   │   ├── engine/          # Validation engine that orchestrates rules
│   │   │   └── utils/           # Shared utilities (date math, statistics)
│   │   ├── tests/
│   │   └── package.json
│   ├── api/                     # NestJS backend
│   │   ├── src/
│   │   │   ├── deals/           # Deal ingestion and storage
│   │   │   ├── validation/      # Validation endpoints
│   │   │   ├── hubspot/         # HubSpot integration module
│   │   │   ├── benchmarks/      # Historical benchmark computation
│   │   │   └── reports/         # Pipeline integrity report generation
│   │   └── package.json
│   ├── web/                     # React dashboard
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── hooks/
│   │   └── package.json
│   └── mock-data/               # Mock data generator (dev tool)
│       ├── src/
│       │   ├── generators/
│       │   └── scenarios/
│       └── package.json
├── prisma/
│   └── schema.prisma
├── docs/
│   ├── architecture.md
│   └── validation-rules.md
└── .github/
    └── workflows/
        └── ci.yml
```

---

## Shared Type Definitions

These types are used across ALL tickets. They live in `packages/core/src/types/`.

### Deal Types

```typescript
// packages/core/src/types/deal.ts

export interface Deal {
  id: string;
  externalId: string;              // CRM deal ID (e.g., HubSpot deal ID)
  name: string;
  stage: DealStage;
  stageId: string;                 // Raw CRM stage identifier
  amount: number;                  // Deal value in cents
  currency: string;                // ISO 4217 (e.g., "USD")
  closeDate: Date;
  createdAt: Date;
  lastModifiedAt: Date;
  ownerId: string;                 // Sales rep ID
  ownerName: string;
  pipelineId: string;
  contacts: DealContact[];
  activities: DealActivity[];
  stageHistory: StageChange[];
}

export interface DealContact {
  id: string;
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  seniorityLevel: SeniorityLevel | null;   // Derived from title
  role: string | null;                      // CRM contact role on deal
  addedAt: Date;
}

export interface DealActivity {
  id: string;
  type: ActivityType;
  timestamp: Date;
  description: string | null;
}

export interface StageChange {
  fromStage: string;
  toStage: string;
  changedAt: Date;
}

export type ActivityType =
  | 'stage_change'
  | 'contact_added'
  | 'note_created'
  | 'task_created'
  | 'task_completed'
  | 'field_updated';

export type SeniorityLevel =
  | 'c_level'        // CEO, CTO, CFO, COO, CRO, CMO
  | 'vp'             // VP, SVP, EVP
  | 'director'       // Director, Senior Director
  | 'manager'        // Manager, Senior Manager, Head of
  | 'individual'     // All others
  | 'unknown';
```

### Deal Stage Types

```typescript
// packages/core/src/types/stage.ts

export interface DealStage {
  id: string;
  name: string;
  displayOrder: number;            // Position in pipeline (0-indexed)
  probability: number;             // CRM-assigned probability (0-100)
  isClosed: boolean;
  isWon: boolean;
}

// Normalized stage category for cross-CRM compatibility
export type StageCategory =
  | 'qualification'    // Early: discovery, qualification
  | 'evaluation'       // Mid: demo, evaluation, POC
  | 'proposal'         // Late: proposal, negotiation
  | 'closing'          // Final: contract, legal review
  | 'closed_won'
  | 'closed_lost';

export interface StageMapping {
  stageId: string;
  stageName: string;
  category: StageCategory;
}
```

### Validation Types

```typescript
// packages/core/src/types/validation.ts

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
```

### Benchmark / Historical Data Types

```typescript
// packages/core/src/types/benchmark.ts

export interface ClosedDealRecord {
  id: string;
  amount: number;
  cycleLengthDays: number;           // Created to closed-won
  contactCount: number;
  stageTimeline: {
    stageId: string;
    stageName: string;
    daysInStage: number;
    percentOfCycle: number;
  }[];
  closedAt: Date;
}

export interface BenchmarkConfig {
  // Minimum closed-won deals needed for reliable benchmarks
  minDealsForBenchmark: number;          // Default: 20
  // Lookback window for benchmark computation
  lookbackMonths: number;                // Default: 12
  // Deal size segments (in cents)
  amountSegments: { min: number; max: number; label: string }[];
}

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  minDealsForBenchmark: 20,
  lookbackMonths: 12,
  amountSegments: [
    { min: 0, max: 2000000, label: '<$20k' },              // Under $20k
    { min: 2000000, max: 5000000, label: '$20k-$50k' },
    { min: 5000000, max: 10000000, label: '$50k-$100k' },
    { min: 10000000, max: Infinity, label: '$100k+' },
  ],
};

// Fallback benchmarks when insufficient historical data
export const INDUSTRY_FALLBACK_BENCHMARKS = {
  medianCycleDays: 75,
  stageDistribution: [
    { category: 'qualification' as const, percentOfCycle: 25 },
    { category: 'evaluation' as const, percentOfCycle: 30 },
    { category: 'proposal' as const, percentOfCycle: 25 },
    { category: 'closing' as const, percentOfCycle: 20 },
  ],
  contactsByAmount: [
    { maxAmount: 2000000, minContacts: 1 },
    { maxAmount: 5000000, minContacts: 2 },
    { maxAmount: 10000000, minContacts: 3 },
    { maxAmount: Infinity, minContacts: 4 },
  ],
};
```

---

## Ticket 1: Repository Scaffolding

**Goal:** Set up the monorepo with all packages, basic configuration, CI pipeline, and database schema. After this ticket, every subsequent ticket can be worked on independently.

### Acceptance Criteria

1. Turborepo monorepo with four packages: `core`, `api`, `web`, `mock-data`
2. TypeScript configured across all packages with strict mode
3. `packages/core` exports all shared types defined above
4. `packages/api` is a working NestJS app that starts and responds to `GET /health` with `{ status: "ok" }`
5. `packages/web` is a working React + Vite app with Tailwind CSS that renders a placeholder page
6. `packages/mock-data` is a TypeScript package with a placeholder `generate()` export
7. Prisma schema defined (see below) with PostgreSQL as the provider
8. GitHub Actions CI runs: typecheck, lint (ESLint), and test (Jest) on every PR
9. All packages can be built with `turbo build` from root
10. A root `README.md` explains the project structure and how to run locally

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id          String   @id @default(uuid())
  name        String
  crmType     String   // "hubspot" | "salesforce"
  crmConnectedAt DateTime?
  createdAt   DateTime @default(now())
  pipelines   Pipeline[]
  benchmarks  Benchmark[]
}

model Pipeline {
  id             String   @id @default(uuid())
  externalId     String
  name           String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  stages         Stage[]
  deals          Deal[]
  reports        PipelineReport[]

  @@unique([organizationId, externalId])
}

model Stage {
  id           String   @id @default(uuid())
  externalId   String
  name         String
  displayOrder Int
  probability  Int      // 0-100
  isClosed     Boolean  @default(false)
  isWon        Boolean  @default(false)
  category     String   // StageCategory
  pipelineId   String
  pipeline     Pipeline @relation(fields: [pipelineId], references: [id])

  @@unique([pipelineId, externalId])
}

model Deal {
  id              String   @id @default(uuid())
  externalId      String
  name            String
  amount          Int      // Cents
  currency        String   @default("USD")
  closeDate       DateTime
  createdAt       DateTime
  lastModifiedAt  DateTime
  ownerId         String
  ownerName       String
  stageId         String
  pipelineId      String
  pipeline        Pipeline @relation(fields: [pipelineId], references: [id])
  contacts        Contact[]
  activities      Activity[]
  stageHistory    StageHistory[]
  validationResults ValidationResultRecord[]

  @@unique([pipelineId, externalId])
}

model Contact {
  id           String   @id @default(uuid())
  externalId   String
  email        String
  firstName    String
  lastName     String
  title        String?
  seniorityLevel String?
  role         String?
  addedAt      DateTime
  dealId       String
  deal         Deal     @relation(fields: [dealId], references: [id])
}

model Activity {
  id          String   @id @default(uuid())
  type        String   // ActivityType
  timestamp   DateTime
  description String?
  dealId      String
  deal        Deal     @relation(fields: [dealId], references: [id])
}

model StageHistory {
  id        String   @id @default(uuid())
  fromStage String
  toStage   String
  changedAt DateTime
  dealId    String
  deal      Deal     @relation(fields: [dealId], references: [id])
}

model Benchmark {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  computedAt     DateTime @default(now())
  data           Json     // BenchmarkMetadata serialized
}

model PipelineReport {
  id         String   @id @default(uuid())
  pipelineId String
  pipeline   Pipeline @relation(fields: [pipelineId], references: [id])
  generatedAt DateTime @default(now())
  summary    Json     // { errors, warnings, healthy }
  results    Json     // Full DealValidationResult[]
}

model ValidationResultRecord {
  id          String   @id @default(uuid())
  dealId      String
  deal        Deal     @relation(fields: [dealId], references: [id])
  validatorId String
  severity    String
  title       String
  description String
  dataPoints  Json
  confidence  String
  createdAt   DateTime @default(now())
}
```

### Notes for Implementation

- Use `turbo.json` pipeline with `build`, `test`, `lint`, `typecheck` tasks
- `packages/core` should have no dependencies on other packages
- `packages/api` depends on `packages/core`
- `packages/web` depends on `packages/core`
- `packages/mock-data` depends on `packages/core`
- Use path aliases: `@winnow/core`, `@winnow/api`, etc.
- ESLint config: extend `@typescript-eslint/recommended`
- Jest config per package, with `ts-jest` preset
- `.env.example` with `DATABASE_URL=postgresql://localhost:5432/winnow`

---

## Ticket 2: Mock Data Generator

**Goal:** Build a mock data generator that produces realistic HubSpot-like deal data with configurable scenarios. This is critical for development and demos — every validator will be tested against this data.

### Acceptance Criteria

1. A `generatePipeline()` function that returns a full dataset: organization, pipeline with stages, deals, contacts, activities, stage history
2. Configurable via a `ScenarioConfig` object (see below)
3. Includes at least 5 pre-built scenarios that trigger specific validation rules
4. Generated data matches all shared type interfaces from `packages/core`
5. Deals have realistic names (use company name + product pattern, e.g., "Acme Corp - Enterprise License")
6. Contact titles are realistic and map correctly to `SeniorityLevel`
7. Stage history is chronologically consistent (no time travel)
8. A CLI entry point: `npx tsx packages/mock-data/src/cli.ts --scenario mixed --deals 50` that outputs JSON to stdout
9. Unit tests verify data consistency (e.g., stage history matches current stage, close dates are valid dates)

### ScenarioConfig

```typescript
interface ScenarioConfig {
  name: string;
  dealCount: number;
  // Distribution of deal "health" statuses
  distribution: {
    healthy: number;               // Percentage of deals that are healthy (0-100)
    unrealisticCloseDate: number;  // Percentage with close date issues
    missingBuyingCommittee: number;
    staleDeals: number;            // Stage-activity mismatch
  };
  // Pipeline configuration
  pipeline: {
    stages: { name: string; category: StageCategory; probability: number }[];
  };
  // Deal generation params
  dealParams: {
    amountRange: { min: number; max: number };  // In cents
    cycleLengthRange: { min: number; max: number };  // Days
    contactsRange: { min: number; max: number };
  };
  // Historical closed-won deals for benchmark computation
  closedWonCount: number;
}
```

### Pre-built Scenarios

1. **`healthy`** — 40 deals, 80% healthy, 20% minor warnings. Good for baseline testing.
2. **`problematic`** — 40 deals, 30% healthy, rest have various issues. Good for demo.
3. **`unrealistic-dates`** — 30 deals, 60% have unrealistic close dates. Tests close date validator.
4. **`thin-committees`** — 30 deals, 60% have too few contacts for their deal size. Tests buying committee validator.
5. **`stale-pipeline`** — 30 deals, 60% have no recent CRM activity despite being in active stages. Tests activity mismatch validator.
6. **`mixed`** (default) — 50 deals, realistic mix of all issue types. Best for integration testing and demos.

### Data Generation Rules

**Healthy deals should:**
- Have close dates consistent with their stage and creation date
- Have contact counts appropriate for their deal value
- Show recent activity (within last 7 days if in active stage)
- Have stage history showing steady progression

**Unhealthy deals (unrealistic close date) should:**
- Be in early stages (qualification/evaluation) but have close dates within 2 weeks
- OR have been created recently (< 20 days ago) with close dates this quarter
- Include deals where close date has been pushed multiple times (3+ stage history entries of field_updated type with close date mentions)

**Unhealthy deals (missing buying committee) should:**
- Have amount > $50k but only 1 contact
- OR have amount > $20k in proposal/closing stage with only 1 contact
- Some should have contacts at the account level that aren't linked to the deal (for future "unlinked contacts" detection)

**Unhealthy deals (stale / stage-activity mismatch) should:**
- Be in evaluation/proposal/closing stage
- Have lastModifiedAt > 14 days ago
- Have no activities in the last 14+ days
- Have stage history showing the current stage was entered 20+ days ago with nothing since

**Closed-won historical deals should:**
- Span the last 12 months
- Have complete stage timelines (time in each stage)
- Have realistic contact counts (more contacts for bigger deals)
- Be used for benchmark computation

### Contact Title Generation

Use realistic B2B titles with correct seniority mapping:

```
c_level:     CEO, CTO, CFO, COO, CRO, CMO, CIO, CISO
vp:          VP of Sales, VP Engineering, SVP Marketing, EVP Operations
director:    Director of IT, Senior Director of Procurement, Director of Engineering
manager:     Engineering Manager, Head of DevOps, Senior Product Manager, IT Manager
individual:  Software Engineer, Account Executive, Marketing Specialist, Analyst
```

---

## Ticket 3: Benchmark Computation Service

**Goal:** Build the service that analyzes closed-won deal history and computes the benchmarks that validators use as thresholds. This must run before validation and its output is passed to each validator.

### Why This Is a Separate Ticket

All three validators need benchmarks to be reliable. The Unrealistic Close Date validator needs median cycle length per segment. The Missing Buying Committee validator needs contact count percentiles per segment. The Stage-Activity Mismatch validator needs expected time-in-stage. Computing these once and sharing them is cleaner than each validator computing its own.

### Acceptance Criteria

1. A `BenchmarkService` in `packages/core/src/engine/benchmark.service.ts`
2. Takes an array of `ClosedDealRecord[]` and a `BenchmarkConfig`
3. Returns `BenchmarkMetadata` (see shared types)
4. Falls back to `INDUSTRY_FALLBACK_BENCHMARKS` when insufficient data (< `minDealsForBenchmark`)
5. Correctly computes: median cycle length (overall and per segment), stage time distribution (median % of cycle per stage), contact count percentiles per deal size segment
6. Sets `confidence` level: `high` (50+ deals), `medium` (20-49), `low` (< 20)
7. Sets `message` when confidence is low, explaining the limitation
8. Unit tests cover: normal computation with 50+ deals, low data scenario with 5 deals (should use fallback), edge cases (all deals same amount, single stage pipeline)

### Computation Logic

**Median cycle length:**
```
For each amount segment:
  1. Filter closed-won deals in that segment from last N months
  2. Compute median of cycleLengthDays
  3. Record deal count
```

**Stage time distribution:**
```
For all closed-won deals:
  1. For each stage in their timeline, compute daysInStage / totalCycleDays * 100
  2. Group by stage
  3. Compute median percentOfCycle per stage
```

**Contact count thresholds:**
```
For each amount segment:
  1. Filter closed-won deals in that segment
  2. Compute 25th percentile (p25) of contact counts — this becomes the minimum
  3. Compute median as the "healthy" target
```

### Statistical Utilities

Create `packages/core/src/utils/stats.ts`:

```typescript
export function median(values: number[]): number;
export function percentile(values: number[], p: number): number;  // p: 0-100
export function segmentize<T>(items: T[], segments: { min: number; max: number }[], valueExtractor: (item: T) => number): Map<string, T[]>;
```

---

## Ticket 4: Unrealistic Close Date Validator

**Goal:** Implement the first validation rule. Flag deals whose close date is inconsistent with their stage and historical cycle length.

### Acceptance Criteria

1. Implements the `Validator` interface (see below)
2. Lives in `packages/core/src/validators/unrealistic-close-date.validator.ts`
3. Uses benchmarks from `BenchmarkMetadata` (not hard-coded thresholds)
4. Falls back to industry benchmarks when benchmark confidence is low
5. Returns `ValidationResult` with severity, description, and dataPoints
6. Does NOT flag closed deals (won or lost)
7. Unit tests cover all scenarios listed below

### Validator Interface

All validators implement this interface:

```typescript
// packages/core/src/engine/validator.interface.ts

export interface Validator {
  id: ValidatorId;
  name: string;
  description: string;
  validate(deal: Deal, context: ValidationContext): ValidationResult | null;
  // Returns null if deal passes validation (no issue found)
}

export interface ValidationContext {
  benchmarks: BenchmarkMetadata;
  stageMappings: StageMapping[];
  currentDate: Date;  // Injected for testability, never use Date.now() directly
}
```

### Detection Logic

```
Input: deal, benchmarks, stage mappings, current date

1. Skip if deal.stage.isClosed → return null

2. Determine the deal's amount segment from benchmarks.cycleLengthBySegment
   - If no matching segment, use overall medianCycleLength

3. Get expectedRemainingDays:
   a. Find deal's stage category from stageMappings
   b. Look up cumulative % of cycle completed at this stage from benchmarks.stageDistribution
      Example: if qualification = 25% and evaluation = 30%, then a deal in evaluation
      has completed ~55% of cycle
   c. expectedRemainingDays = medianCycleDays * (1 - cumulativePercent / 100)

4. Get actualRemainingDays = deal.closeDate - currentDate (in days)

5. Compute ratio = actualRemainingDays / expectedRemainingDays

6. Apply thresholds:
   - ratio < 0.3 → severity: 'error'
     "Close date is in {actualRemainingDays} days, but deals at this stage
     typically need {expectedRemainingDays}+ days to close."
   - ratio 0.3-0.5 → severity: 'warning'
     "Close date appears ambitious. {actualRemainingDays} days remaining
     vs typical {expectedRemainingDays} days."
   - ratio > 0.5 → return null (no issue)

7. If close date is in the past and deal is still open → severity: 'error'
   "Close date has passed ({deal.closeDate}). Deal is still in {deal.stage.name}."
```

### DataPoints to Include

```typescript
dataPoints: {
  closeDate: deal.closeDate,
  actualRemainingDays: number,
  expectedRemainingDays: number,
  medianCycleDays: number,
  currentStage: deal.stage.name,
  stageCategory: string,
  cumulativeProgress: number,       // Percentage
  dealAmount: deal.amount,
  benchmarkSource: 'historical' | 'industry_fallback',
  ratio: number,
}
```

### Confidence Level

- `high` if benchmarks come from historical data with 20+ deals in this segment
- `medium` if benchmarks are from historical data but < 20 deals in segment
- `low` if using industry fallback

### Test Scenarios

1. **Passes:** Deal in qualification, close date 60 days out, median cycle 75 days → no flag
2. **Error — way too soon:** Deal in qualification, close date 5 days out, median cycle 90 days → error
3. **Warning — ambitious:** Deal in evaluation, close date 15 days out, median cycle 80 days → warning
4. **Error — past due:** Deal still open, close date was 10 days ago → error
5. **Skip closed deals:** Closed-won deal with unrealistic date → no flag (null)
6. **Industry fallback:** No historical data, uses default 75-day cycle → flags with low confidence
7. **Large deal longer cycle:** $100k deal in qualification, close date 20 days, segment median is 120 days → error

---

## Ticket 5: Missing Buying Committee Validator

**Goal:** Flag deals that have too few contacts associated relative to their deal value and stage.

### Acceptance Criteria

1. Implements `Validator` interface
2. Lives in `packages/core/src/validators/missing-buying-committee.validator.ts`
3. Uses p25 contact counts from `BenchmarkMetadata.contactCountBySegment`
4. Only flags deals in evaluation stage or later (not qualification — too early)
5. Includes seniority analysis as a secondary signal
6. Unit tests cover all scenarios

### Detection Logic

```
Input: deal, benchmarks, stage mappings, current date

1. Skip if deal.stage.isClosed → return null

2. Find deal's stage category from stageMappings
   Skip if category is 'qualification' → return null (too early to flag)

3. Get expected contact threshold:
   a. Find deal's amount segment in benchmarks.contactCountBySegment
   b. minimumContacts = p25Contacts for that segment
   c. healthyContacts = medianContacts for that segment
   If no segment match or using fallback: use INDUSTRY_FALLBACK_BENCHMARKS.contactsByAmount

4. actualContacts = deal.contacts.length

5. Apply thresholds:
   - actualContacts < minimumContacts → severity: 'error'
   - actualContacts >= minimumContacts but < healthyContacts → severity: 'warning'
   - actualContacts >= healthyContacts → check seniority only (step 6)

6. Seniority check (secondary signal, only produces 'warning' or 'info'):
   If deal.amount > $50k (5000000 cents):
     - Count contacts with seniorityLevel in ['c_level', 'vp', 'director']
     - If zero senior contacts → warning: "No senior stakeholders identified"
     - If deal.amount > $100k and no c_level or vp → info: "No executive sponsor identified"

7. Return the highest severity result found (error > warning > info)
   If nothing flagged → return null
```

### DataPoints

```typescript
dataPoints: {
  contactCount: number,
  minimumExpected: number,
  healthyExpected: number,
  dealAmount: number,
  currentStage: string,
  contacts: { name: string; title: string; seniority: string }[],
  seniorContacts: number,
  benchmarkSource: 'historical' | 'industry_fallback',
}
```

### Title Parsing Utility

Create `packages/core/src/utils/seniority.ts`:

```typescript
export function deriveSeniorityLevel(title: string | null): SeniorityLevel {
  if (!title) return 'unknown';
  const t = title.toLowerCase();

  // C-level
  if (/\b(ceo|cto|cfo|coo|cro|cmo|cio|ciso|chief)\b/.test(t)) return 'c_level';

  // VP
  if (/\b(vp|vice president|svp|evp)\b/.test(t)) return 'vp';

  // Director
  if (/\bdirector\b/.test(t)) return 'director';

  // Manager / Head of
  if (/\b(manager|head of|team lead)\b/.test(t)) return 'manager';

  return 'individual';
}
```

### Test Scenarios

1. **Passes:** $30k deal in proposal with 3 contacts, benchmark p25 = 2 → no flag
2. **Error — single contact on large deal:** $80k deal in proposal with 1 contact, benchmark p25 = 3 → error
3. **Warning — below median:** $40k deal in evaluation with 2 contacts, p25 = 1, median = 3 → warning
4. **Skip qualification:** $80k deal in qualification with 1 contact → no flag (too early)
5. **Skip closed deals:** Closed-lost with 1 contact → no flag
6. **Seniority warning:** $120k deal with 4 contacts, all "Software Engineer" → warning about no senior stakeholders
7. **Industry fallback:** No benchmark data, $60k deal with 1 contact → error using fallback thresholds

---

## Ticket 6: Stage-Activity Mismatch Validator

**Goal:** Flag deals in active stages that show no meaningful CRM activity for an extended period.

### Acceptance Criteria

1. Implements `Validator` interface
2. Lives in `packages/core/src/validators/stage-activity-mismatch.validator.ts`
3. Uses stage-specific staleness thresholds (not one-size-fits-all)
4. Only considers "structural" CRM events (not manually logged notes)
5. Severity scales with stage advancement (negotiation stale = worse than discovery stale)
6. Unit tests cover all scenarios

### Detection Logic

```
Input: deal, benchmarks, stage mappings, current date

1. Skip if deal.stage.isClosed → return null

2. Find stage category from stageMappings

3. Determine lastMeaningfulActivity date:
   Look at deal.activities and deal.stageHistory
   Consider these as "meaningful":
     - stage_change
     - contact_added
     - task_created
     - task_completed
   Ignore:
     - field_updated (often just CRM cleanup)
     - note_created (inconsistent logging, too noisy)
   Also consider: deal.lastModifiedAt as a secondary signal
   Take the most recent date among meaningful activities

4. Calculate daysSinceActivity = currentDate - lastMeaningfulActivity

5. Apply stage-specific thresholds:

   qualification:
     warning: daysSinceActivity >= 21
     error:   daysSinceActivity >= 35

   evaluation:
     warning: daysSinceActivity >= 14
     error:   daysSinceActivity >= 28

   proposal:
     warning: daysSinceActivity >= 10
     error:   daysSinceActivity >= 21

   closing:
     warning: daysSinceActivity >= 7
     error:   daysSinceActivity >= 14

6. If threshold exceeded → return result with appropriate severity

7. Description should include:
   "No meaningful activity for {daysSinceActivity} days. Deal has been in
   {stage.name} since {stageEnteredDate}. Last activity: {lastActivityType}
   on {lastActivityDate}."
```

### DataPoints

```typescript
dataPoints: {
  daysSinceActivity: number,
  lastActivityDate: Date | null,
  lastActivityType: string | null,
  currentStage: string,
  stageCategory: string,
  stageEnteredDate: Date | null,
  daysInCurrentStage: number,
  threshold: { warning: number; error: number },
}
```

### Edge Cases to Handle

- **No activities at all:** Use deal.createdAt as lastMeaningfulActivity
- **Stage history empty:** Use deal.createdAt as stageEnteredDate
- **Deal just created (< 3 days):** Don't flag regardless of stage

### Test Scenarios

1. **Passes:** Deal in evaluation, last stage_change 5 days ago → no flag
2. **Warning — evaluation stale:** Deal in evaluation, no activity for 16 days → warning
3. **Error — proposal very stale:** Deal in proposal, no activity for 25 days → error
4. **More severe in closing:** Deal in closing, no activity for 8 days → warning (tighter threshold)
5. **Qualification more lenient:** Deal in qualification, no activity for 18 days → no flag (threshold is 21)
6. **Ignores field_updated:** Deal in proposal, only activity is field_updated 5 days ago, last meaningful is 22 days ago → error
7. **Skip closed deals:** Closed deal with no activity → no flag
8. **Brand new deal:** Deal created 2 days ago in evaluation with no activity → no flag

---

## Ticket 7: Validation Engine

**Goal:** Build the orchestrator that runs all validators against all open deals and produces a `PipelineIntegrityReport`.

### Acceptance Criteria

1. A `ValidationEngine` class in `packages/core/src/engine/validation-engine.ts`
2. Takes a list of deals, benchmark metadata, stage mappings, and a list of validators
3. Runs every validator against every open deal
4. Aggregates results into a `PipelineIntegrityReport`
5. Correctly computes deal status: `error` if any validation has severity error, `warning` if highest is warning, `healthy` if no validations
6. Sorts deal results: errors first, then warnings, then healthy
7. Unit tests using mock validators to test orchestration logic independently of real validators

### Engine API

```typescript
// packages/core/src/engine/validation-engine.ts

export class ValidationEngine {
  private validators: Validator[];

  constructor(validators: Validator[]) {
    this.validators = validators;
  }

  validate(
    deals: Deal[],
    context: ValidationContext,
  ): PipelineIntegrityReport {
    // 1. Filter to open deals only (not closed)
    // 2. Run each validator against each open deal
    // 3. Collect results per deal
    // 4. Determine deal status from highest severity
    // 5. Sort: errors first, then warnings, then healthy
    // 6. Build PipelineIntegrityReport
  }
}
```

### Integration Test

After all validators are implemented, create an integration test in `packages/core/tests/integration/`:

1. Use mock data generator to create a "mixed" scenario
2. Run BenchmarkService on closed-won deals
3. Run ValidationEngine with all 3 validators
4. Assert that the report has expected number of errors/warnings
5. Assert that known-bad deals are flagged correctly
6. Assert that known-healthy deals are not flagged

---

## Ticket 8: Pipeline Integrity Report API

**Goal:** Build the NestJS API endpoint that triggers validation and returns the report.

### Acceptance Criteria

1. `POST /api/validate` endpoint that accepts a pipeline ID and returns a `PipelineIntegrityReport`
2. `GET /api/reports/:id` endpoint that returns a stored report
3. `GET /api/reports` endpoint that returns list of past reports for an organization
4. Pipeline data is loaded from the database (seeded from mock data for now)
5. Benchmarks are computed at validation time from closed-won deals in the DB
6. Report is stored in the `PipelineReport` table after generation
7. Proper error handling: 404 for missing pipeline, 400 for invalid input
8. Endpoint response time < 2 seconds for 50 deals

### API Spec

```
POST /api/validate
Body: { pipelineId: string }
Response: PipelineIntegrityReport

GET /api/reports
Query: ?pipelineId=xxx
Response: { reports: PipelineReport[] }

GET /api/reports/:id
Response: PipelineReport (with full results)
```

### NestJS Module Structure

```
packages/api/src/
  validation/
    validation.module.ts
    validation.controller.ts
    validation.service.ts         # Orchestrates: load deals → compute benchmarks → run engine → store report
  deals/
    deals.module.ts
    deals.service.ts              # CRUD for deals, loads from DB
  benchmarks/
    benchmarks.module.ts
    benchmarks.service.ts         # Wraps core BenchmarkService, loads closed-won from DB
  reports/
    reports.module.ts
    reports.controller.ts
    reports.service.ts            # CRUD for reports
```

### Seed Command

Create a CLI command or NestJS seed script:

```bash
npx tsx packages/api/src/seed.ts --scenario mixed
```

This should:
1. Generate mock data using `packages/mock-data`
2. Insert organization, pipeline, stages, deals, contacts, activities, stage history into DB
3. Insert closed-won historical deals for benchmarks

---

## Ticket 9: Dashboard MVP

**Goal:** Build a React dashboard that displays the Pipeline Integrity Report.

### Acceptance Criteria

1. Dashboard page at `/` that shows the latest report summary
2. Report header: total deals, errors count, warnings count, healthy count
3. Deals table with columns: deal name, amount, stage, owner, status (error/warning/healthy), close date
4. Status shown as colored badges: red (error), yellow (warning), green (healthy)
5. Click on a deal row to expand and see validation details
6. Validation details show: validator name, severity, description, and key data points
7. Filter controls: show all / errors only / warnings only
8. Sort by: status (errors first), amount, close date
9. Responsive layout (works on desktop, readable on tablet)
10. Calls `GET /api/reports` on load, displays most recent report
11. A "Run Validation" button that calls `POST /api/validate` and refreshes

### UI Components

```
ReportHeader        — Summary cards (total, errors, warnings, healthy)
DealsTable          — Main table with sortable columns
DealRow             — Expandable row showing deal info + validation flags
ValidationBadge     — Colored severity indicator
ValidationDetail    — Expanded view of a single validation result
FilterBar           — Status filter buttons + sort dropdown
```

### Design Notes

- Use Tailwind utility classes exclusively
- Keep it clean and data-dense — this is a tool for RevOps, not a consumer app
- Color palette: red-500 for errors, amber-500 for warnings, green-500 for healthy, gray backgrounds
- Font: system font stack (no custom fonts needed)
- No authentication for MVP — single-tenant assumed

### Data Flow

```
Page loads
  → GET /api/reports?pipelineId=default
  → Display most recent report
  → User clicks "Run Validation"
  → POST /api/validate { pipelineId: "default" }
  → Response is the new report
  → Update UI
```

---

## Appendix: Implementation Order & Dependencies

```
Ticket 1: Repo Scaffolding           ← No dependencies (do first)
    ↓
Ticket 2: Mock Data Generator        ← Depends on: types from Ticket 1
    ↓
Ticket 3: Benchmark Service          ← Depends on: types from Ticket 1
    ↓
Tickets 4, 5, 6: Validators          ← Depend on: Ticket 3 (benchmarks)
    (can be done in parallel)           Each is independent of the others
    ↓
Ticket 7: Validation Engine          ← Depends on: Tickets 4, 5, 6
    ↓
Ticket 8: API                        ← Depends on: Tickets 2, 3, 7
    ↓
Ticket 9: Dashboard                  ← Depends on: Ticket 8
```

Estimated effort per ticket with AI agent execution:
- Ticket 1: ~1 session (scaffolding is well-defined)
- Ticket 2: ~1-2 sessions (data generation is fiddly)
- Ticket 3: ~1 session
- Tickets 4-6: ~1 session each
- Ticket 7: ~1 session
- Ticket 8: ~1-2 sessions (NestJS wiring + seed script)
- Ticket 9: ~2 sessions (UI has more iteration)

Total: ~10-12 Claude Code sessions to reach a working MVP with mock data.
