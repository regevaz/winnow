import { Module } from '@nestjs/common';
import { HubspotController } from './hubspot.controller';
import { HubspotService } from './hubspot.service';
import { HubspotApiClient } from './hubspot-api.client';
import { HubspotSyncWriterService } from './hubspot-sync-writer.service';

@Module({
  providers: [HubspotService, HubspotApiClient, HubspotSyncWriterService],
  controllers: [HubspotController],
})
export class HubspotModule {}
