import { Module } from '@nestjs/common';
import { HubspotController } from './hubspot.controller';
import { HubspotService } from './hubspot.service';
import { HubspotApiClient } from './hubspot-api.client';
import { HubspotSyncWriterService } from './hubspot-sync-writer.service';
import { HubspotOAuthService } from './hubspot-oauth.service';
import { HubspotOAuthController } from './hubspot-oauth.controller';

@Module({
  providers: [HubspotService, HubspotApiClient, HubspotSyncWriterService, HubspotOAuthService],
  controllers: [HubspotController, HubspotOAuthController],
  exports: [HubspotApiClient, HubspotOAuthService],
})
export class HubspotModule {}
