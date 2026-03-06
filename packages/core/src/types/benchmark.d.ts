export interface ClosedDealRecord {
    id: string;
    amount: number;
    cycleLengthDays: number;
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
    minDealsForBenchmark: number;
    lookbackMonths: number;
    amountSegments: {
        min: number;
        max: number;
        label: string;
    }[];
}
export declare const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig;
export declare const INDUSTRY_FALLBACK_BENCHMARKS: {
    medianCycleDays: number;
    stageDistribution: ({
        category: "qualification";
        percentOfCycle: number;
    } | {
        category: "evaluation";
        percentOfCycle: number;
    } | {
        category: "proposal";
        percentOfCycle: number;
    } | {
        category: "closing";
        percentOfCycle: number;
    })[];
    contactsByAmount: {
        maxAmount: number;
        minContacts: number;
    }[];
};
//# sourceMappingURL=benchmark.d.ts.map