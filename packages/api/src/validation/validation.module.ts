import { Module } from '@nestjs/common';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { DealsModule } from '../deals/deals.module';
import { BenchmarksModule } from '../benchmarks/benchmarks.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [DealsModule, BenchmarksModule, ReportsModule],
  controllers: [ValidationController],
  providers: [ValidationService],
})
export class ValidationModule {}
