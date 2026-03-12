import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PipelineIntegrityReport } from '@winnow/core';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(report: PipelineIntegrityReport): Promise<string> {
    const created = await this.prisma.pipelineReport.create({
      data: {
        pipelineId: report.pipelineId,
        generatedAt: report.generatedAt,
        summary: report.summary as any,
        results: report.dealResults as any,
      },
    });

    return created.id;
  }

  async findAll(pipelineId?: string): Promise<Array<{ id: string; generatedAt: Date; summary: any }>> {
    const reports = await this.prisma.pipelineReport.findMany({
      where: pipelineId ? { pipelineId } : undefined,
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        pipelineId: true,
        generatedAt: true,
        summary: true,
      },
    });

    return reports;
  }

  async findOne(id: string): Promise<PipelineIntegrityReport> {
    const report = await this.prisma.pipelineReport.findUnique({
      where: { id },
      include: {
        pipeline: true,
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    // Reconstruct PipelineIntegrityReport
    // Note: benchmarkMetadata is not stored in the report, so we return null
    // In a real implementation, we might want to store this or recompute it
    return {
      generatedAt: report.generatedAt,
      pipelineId: report.pipelineId,
      totalDeals: (report.results as any[]).length,
      summary: report.summary as any,
      dealResults: report.results as any,
      benchmarkMetadata: null as any, // Not stored, would need to be recomputed
    };
  }
}
