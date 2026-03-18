import { Module } from '@nestjs/common';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';
import { HubspotModule } from '../hubspot/hubspot.module';

@Module({
  imports: [HubspotModule],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
