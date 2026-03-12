import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DealsModule } from './deals/deals.module';
import { BenchmarksModule } from './benchmarks/benchmarks.module';
import { ReportsModule } from './reports/reports.module';
import { ValidationModule } from './validation/validation.module';

@Module({
  imports: [
    PrismaModule,
    DealsModule,
    BenchmarksModule,
    ReportsModule,
    ValidationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
