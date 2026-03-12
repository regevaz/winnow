import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DealsService } from '../deals/deals.service';
import { BenchmarksService } from '../benchmarks/benchmarks.service';
import { ReportsService } from '../reports/reports.service';
import {
  ValidationEngine,
  UnrealisticCloseDateValidator,
  MissingBuyingCommitteeValidator,
  StageActivityMismatchValidator,
  PipelineIntegrityReport,
  ValidationContext,
} from '@winnow/core';

@Injectable()
export class ValidationService {
  private readonly engine: ValidationEngine;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dealsService: DealsService,
    private readonly benchmarksService: BenchmarksService,
    private readonly reportsService: ReportsService
  ) {
    // Initialize validation engine with all validators
    this.engine = new ValidationEngine([
      new UnrealisticCloseDateValidator(),
      new MissingBuyingCommitteeValidator(),
      new StageActivityMismatchValidator(),
    ]);
  }

  async validatePipeline(pipelineId: string): Promise<PipelineIntegrityReport> {
    // 1. Verify pipeline exists
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { organization: true },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${pipelineId} not found`);
    }

    // 2. Load deals from database
    const deals = await this.dealsService.findAllByPipeline(pipelineId);

    if (deals.length === 0) {
      throw new BadRequestException('Pipeline has no deals to validate');
    }

    // 3. Compute benchmarks from closed-won deals
    const benchmarks = await this.benchmarksService.computeBenchmarks(
      pipeline.organizationId
    );

    // 4. Get stage mappings
    const stageMappings = await this.dealsService.getStageMappings(pipelineId);

    // 5. Build validation context
    const context: ValidationContext = {
      benchmarks,
      stageMappings,
      currentDate: new Date(),
    };

    // 6. Run validation engine
    const report = this.engine.validate(deals, context);

    // 7. Store report in database
    await this.reportsService.create(report);

    return report;
  }
}
