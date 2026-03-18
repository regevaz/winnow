import { Controller, Get, Param } from '@nestjs/common';
import { SummaryService } from './summary.service';
import type { DealContextSummary } from '@winnow/core';

@Controller('api/deals')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get(':id/summary')
  getSummary(@Param('id') id: string): Promise<DealContextSummary> {
    return this.summaryService.getSummary(id);
  }
}
