import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DealsModule } from './deals/deals.module';
import { BenchmarksModule } from './benchmarks/benchmarks.module';
import { ReportsModule } from './reports/reports.module';
import { ValidationModule } from './validation/validation.module';
import { HubspotModule } from './hubspot/hubspot.module';
import { hubspotConfigFactory } from './hubspot/hubspot.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [hubspotConfigFactory] }),
    PrismaModule,
    DealsModule,
    BenchmarksModule,
    ReportsModule,
    ValidationModule,
    HubspotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
