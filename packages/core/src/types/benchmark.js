"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDUSTRY_FALLBACK_BENCHMARKS = exports.DEFAULT_BENCHMARK_CONFIG = void 0;
exports.DEFAULT_BENCHMARK_CONFIG = {
    minDealsForBenchmark: 20,
    lookbackMonths: 12,
    amountSegments: [
        { min: 0, max: 2000000, label: '<$20k' }, // Under $20k
        { min: 2000000, max: 5000000, label: '$20k-$50k' },
        { min: 5000000, max: 10000000, label: '$50k-$100k' },
        { min: 10000000, max: Infinity, label: '$100k+' },
    ],
};
// Fallback benchmarks when insufficient historical data
exports.INDUSTRY_FALLBACK_BENCHMARKS = {
    medianCycleDays: 75,
    stageDistribution: [
        { category: 'qualification', percentOfCycle: 25 },
        { category: 'evaluation', percentOfCycle: 30 },
        { category: 'proposal', percentOfCycle: 25 },
        { category: 'closing', percentOfCycle: 20 },
    ],
    contactsByAmount: [
        { maxAmount: 2000000, minContacts: 1 },
        { maxAmount: 5000000, minContacts: 2 },
        { maxAmount: 10000000, minContacts: 3 },
        { maxAmount: Infinity, minContacts: 4 },
    ],
};
//# sourceMappingURL=benchmark.js.map