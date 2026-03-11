# Winnow

Revenue Pipeline Validator - A tool that connects to your CRM, reads deal and contact data, and runs validation rules to detect pipeline inconsistencies.

## Project Overview

Winnow is a Revenue Pipeline Validator that helps RevOps teams identify issues in their sales pipeline by analyzing CRM data and applying intelligent validation rules. The MVP focuses on CRM integration (starting with HubSpot) without email/calendar integrations.

## Tech Stack

- **Backend:** NestJS (TypeScript)
- **Frontend:** React + Tailwind CSS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Testing:** Jest
- **Monorepo:** Turborepo
- **CI/CD:** GitHub Actions

## Repository Structure

```
winnow/
├── turbo.json                  # Turborepo configuration
├── package.json                # Root package configuration
├── packages/
│   ├── core/                   # Shared types, validation engine, business logic
│   │   ├── src/
│   │   │   ├── types/          # All shared TypeScript interfaces
│   │   │   ├── validators/     # Individual validation rule implementations
│   │   │   ├── engine/         # Validation engine that orchestrates rules
│   │   │   └── utils/          # Shared utilities (date math, statistics)
│   │   └── tests/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── deals/          # Deal ingestion and storage
│   │   │   ├── validation/     # Validation endpoints
│   │   │   ├── hubspot/        # HubSpot integration module
│   │   │   ├── benchmarks/     # Historical benchmark computation
│   │   │   └── reports/        # Pipeline integrity report generation
│   │   └── test/
│   ├── web/                    # React dashboard
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── hooks/
│   │   └── public/
│   └── mock-data/              # Mock data generator (dev tool)
│       ├── src/
│       │   ├── generators/
│       │   └── scenarios/
│       └── tests/
├── prisma/
│   └── schema.prisma           # Database schema
├── docs/
│   ├── specs.md                # Implementation specifications
│   ├── architecture.md         # Architecture documentation (coming soon)
│   └── validation-rules.md     # Validation rules documentation (coming soon)
└── .github/
    └── workflows/
        └── ci.yml              # CI/CD pipeline
```

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm >= 10.2.4

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set your database connection string:

```
DATABASE_URL=postgresql://localhost:5432/winnow
PORT=3000
```

### 3. Set Up the Database

Create the database and run migrations:

```bash
# Create database
createdb winnow

# Generate Prisma client
npx prisma generate

# Run migrations (when available)
npx prisma migrate dev
```

### 4. Build All Packages

```bash
npm run build
```

### 5. Run in Development Mode

Start all packages in development mode:

```bash
npm run dev
```

Or start individual packages:

```bash
# API only
cd packages/api
npm run dev

# Web only
cd packages/web
npm run dev
```

## Available Scripts

From the root directory:

- `npm run build` - Build all packages
- `npm run dev` - Start all packages in development mode
- `npm run test` - Run tests across all packages
- `npm run lint` - Lint all packages
- `npm run typecheck` - Type-check all packages
- `npm run clean` - Clean all build artifacts

## Package Details

### @winnow/core

Shared types, validation engine, and business logic. This package has no dependencies on other packages and is used by `api`, `web`, and `mock-data`.

**Key exports:**
- Type definitions for deals, stages, validation results, benchmarks
- Validation engine and individual validators (unrealistic close date, missing buying committee, stage-activity mismatch)
- Benchmark computation service
- Statistical and seniority utilities

### @winnow/api

NestJS backend application that provides REST API endpoints.

**Available endpoints:**
- `GET /health` - Health check endpoint (returns `{ status: "ok" }`)
- Additional endpoints coming in Ticket 8

**Start the API:**
```bash
cd packages/api
npm run dev
```

The API will be available at `http://localhost:3000`

### @winnow/web

React + Vite + Tailwind CSS dashboard application.

**Start the web app:**
```bash
cd packages/web
npm run dev
```

The web app will be available at `http://localhost:5173`

### @winnow/mock-data

Mock data generator for development and testing. Implementation coming in Ticket 2.

**Usage (placeholder):**
```typescript
import { generate } from '@winnow/mock-data';

const data = generate();
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm run test

# Run tests for a specific package
cd packages/core
npm run test
```

### Type Checking

```bash
# Type-check all packages
npm run typecheck

# Type-check a specific package
cd packages/api
npm run typecheck
```

### Linting

```bash
# Lint all packages
npm run lint

# Lint a specific package
cd packages/web
npm run lint
```

## CI/CD

GitHub Actions automatically runs the following checks on every pull request:

- Type checking (`npm run typecheck`)
- Linting (`npm run lint`)
- Tests (`npm run test`)
- Build (`npm run build`)

## Database Schema

The database schema is defined in `prisma/schema.prisma` and includes models for:

- Organizations
- Pipelines
- Stages
- Deals
- Contacts
- Activities
- Stage History
- Benchmarks
- Pipeline Reports
- Validation Results

See the Prisma schema file for full details.

## Project Status

This is the MVP implementation following a ticket-based development process:

- ✅ **Ticket 1:** Repository Scaffolding (Complete)
- ✅ **Ticket 2:** Mock Data Generator (Complete)
- ✅ **Ticket 3:** Benchmark Computation Service (Complete)
- ✅ **Ticket 4:** Unrealistic Close Date Validator (Complete)
- ✅ **Ticket 5:** Missing Buying Committee Validator (Complete)
- ✅ **Ticket 6:** Stage-Activity Mismatch Validator (Complete)
- ✅ **Ticket 7:** Validation Engine (Complete)
- 🔲 **Ticket 8:** Pipeline Integrity Report API
- 🔲 **Ticket 9:** Dashboard MVP

For detailed implementation specs, see `docs/specs.md`.

## Contributing

This project follows strict TypeScript with all recommended linting rules. Ensure all checks pass before submitting:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## License

Proprietary - All rights reserved
