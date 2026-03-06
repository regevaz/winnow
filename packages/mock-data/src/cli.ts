#!/usr/bin/env node

import { generatePipeline, SCENARIOS } from './index';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: { scenario?: string; deals?: number } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scenario' && i + 1 < args.length) {
      options.scenario = args[i + 1];
      i++;
    } else if (args[i] === '--deals' && i + 1 < args.length) {
      options.deals = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Winnow Mock Data Generator

Usage:
  npx ts-node packages/mock-data/src/cli.ts [options]

Options:
  --scenario <name>    Scenario to generate (default: mixed)
                       Available: ${Object.keys(SCENARIOS).join(', ')}
  --deals <count>      Override number of deals to generate
  --help, -h           Show this help message

Examples:
  npx ts-node packages/mock-data/src/cli.ts --scenario healthy
  npx ts-node packages/mock-data/src/cli.ts --scenario mixed --deals 50
  npx ts-node packages/mock-data/src/cli.ts --scenario problematic --deals 100
`);
}

function main() {
  const options = parseArgs();

  try {
    const overrides = options.deals ? { dealCount: options.deals } : undefined;
    const data = generatePipeline(options.scenario, overrides);

    // Output JSON to stdout
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}

main();
