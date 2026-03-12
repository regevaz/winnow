import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PipelineIntegrityReport } from '@winnow/core';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async findAll(@Query('pipelineId') pipelineId?: string) {
    return { reports: await this.reportsService.findAll(pipelineId) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PipelineIntegrityReport> {
    return this.reportsService.findOne(id);
  }
}
