# CLAUDE.md — Project Instructions for Claude Code

## Project

Winnow — a Revenue Pipeline Validator that connects to CRMs and detects pipeline inconsistencies using signal-based validation rules.

## Specs

All implementation specs, ticket details, shared types, and architecture decisions are in `docs/specs.md`. Always read it before starting any ticket.

## Competitive Context

Before building any feature that touches pipeline health, hygiene monitoring, or deal validation, read `docs/competitors.md`. It contains a detailed breakdown of Scratchpad (the most direct competitor), Clari, Cotera, and native CRM tools. Understanding what they do and where they fall short is essential for making the right product decisions in Winnow.

Market validation evidence (why the problem is real) is in `docs/validation-summary.md`.

## Tech Stack

- **Monorepo:** Turborepo
- **Backend:** NestJS (TypeScript, strict mode)
- **Frontend:** React + Vite + Tailwind CSS
- **Database:** PostgreSQL + Prisma ORM
- **Testing:** Jest with ts-jest
- **Package manager:** npm (use npm workspaces)

## Repository Structure

```
packages/core        — Shared types, validators, validation engine, utilities
packages/api         — NestJS backend
packages/web         — React dashboard
packages/mock-data   — Mock data generator for dev and demos
prisma/              — Prisma schema and migrations
docs/                — Specs and architecture docs
```

## Package Dependencies

- `core` has zero internal dependencies — everything else depends on it
- `api` depends on `core`
- `web` depends on `core`
- `mock-data` depends on `core`

Use `@winnow/core`, `@winnow/api`, `@winnow/web`, `@winnow/mock-data` as package names.

## Coding Conventions

### TypeScript
- Strict mode everywhere (`strict: true` in tsconfig)
- No `any` types — use `unknown` and narrow, or define proper types
- All shared types live in `packages/core/src/types/` — never duplicate type definitions across packages
- Use interfaces over type aliases for object shapes
- Enums are not allowed — use union types (e.g., `type Severity = 'error' | 'warning' | 'info'`)

### NestJS (packages/api)
- One module per domain (deals, validation, reports, hubspot, benchmarks)
- Services contain business logic, controllers are thin
- Use constructor injection for dependencies
- DTOs for all request/response shapes with class-validator decorators

### React (packages/web)
- Functional components only, no class components
- Use hooks for state and effects
- Tailwind utility classes only — no CSS files, no styled-components
- No external UI libraries except what's listed in the specs (shadcn/ui is OK if needed)
- Components go in `src/components/`, pages in `src/pages/`, hooks in `src/hooks/`

### Testing
- Every validator must have unit tests covering all scenarios listed in its ticket spec
- Test files live next to source: `foo.ts` → `foo.test.ts`
- Use descriptive test names: `it('flags deal in proposal with 1 contact when benchmark p25 is 3')`
- Mock external dependencies, never mock the thing you're testing
- Integration tests go in `tests/integration/`

### General
- No console.log in production code — use NestJS Logger in api, remove from core
- All money values are in **cents** (integer) — never use floats for money
- All dates are `Date` objects internally, ISO strings only at API boundaries
- Never call `new Date()` or `Date.now()` directly in validators — use `context.currentDate` for testability

## Git Conventions

- Branch per ticket: `ticket-1/repo-scaffolding`, `ticket-2/mock-data`, etc.
- Commit messages: `ticket-N: short description`
- Run `turbo build` and `turbo test` before committing — both must pass
- Don't commit `.env` files — use `.env.example` with placeholder values

## Running Locally

```bash
# Install dependencies
npm install

# Start database (requires Docker or local PostgreSQL)
# DATABASE_URL=postgresql://localhost:5432/winnow

# Run Prisma migrations
npx prisma migrate dev

# Seed with mock data
npx tsx packages/api/src/seed.ts --scenario mixed

# Start API
npm run dev --workspace=packages/api

# Start frontend
npm run dev --workspace=packages/web

# Run all tests
turbo test

# Build everything
turbo build
```

## Important Patterns

### Validators
All validators implement the `Validator` interface from `packages/core/src/engine/validator.interface.ts`. They receive a `Deal` and `ValidationContext` and return `ValidationResult | null` (null = deal passed). Never throw errors from validators — return null if unsure.

### Benchmarks
Validators never use hard-coded thresholds. All thresholds come from `BenchmarkMetadata` computed by the `BenchmarkService`. When historical data is insufficient (< 20 closed-won deals), use `INDUSTRY_FALLBACK_BENCHMARKS` and set confidence to `low`.

### Severity
Three levels: `error` (high confidence issue), `warning` (likely issue), `info` (worth noting). Default to lower severity when uncertain. False positives destroy trust faster than false negatives.

## Common Mistakes to Avoid

- Don't create separate CSS files for React components — use Tailwind classes inline
- Don't use `WidthType.PERCENTAGE` in any table — use DXA
- Don't hard-code validation thresholds — always derive from benchmarks
- Don't use `any` to silence TypeScript — fix the types
- Don't skip writing tests to save time — tests are required for every validator
- Don't use `new Date()` in validators — use `context.currentDate`
- Don't put business logic in controllers — keep them thin, logic goes in services

## Agent Harness (ECC Plugin)
Installed via everything-claude-code plugin.

### Key agents to use for this project:
- planner → before starting any new feature
- architect → for system design decisions
- tdd-guide → all implementation work
- code-reviewer → after implementation
- database-reviewer → any Prisma/PostgreSQL changes
- build-error-resolver → CI failures

### Key skills active:
- backend-patterns, postgres-patterns, api-design
- tdd-workflow, verification-loop
- cost-aware-llm-pipeline, autonomous-loops
- database-migrations (Prisma)

### Model routing:
- Default: sonnet
- Architecture/deep debugging: /model opus
- Subagents: haiku
