import { Controller, Get, Post } from '@nestjs/common';
import { HubspotService } from './hubspot.service';
import { SyncResultDto } from './dto/sync-result.dto';
import { PipelineListDto } from './dto/pipeline-list.dto';

@Controller('api/hubspot')
export class HubspotController {
  constructor(private readonly hubspotService: HubspotService) {}

  @Post('sync')
  sync(): Promise<SyncResultDto> {
    return this.hubspotService.sync();
  }

  @Get('pipelines')
  listPipelines(): Promise<PipelineListDto[]> {
    return this.hubspotService.listPipelines();
  }
}
