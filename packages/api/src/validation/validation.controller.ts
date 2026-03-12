import { Controller, Post, Body } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { PipelineIntegrityReport } from '@winnow/core';

@Controller('api/validate')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Post()
  async validate(@Body('pipelineId') pipelineId: string): Promise<PipelineIntegrityReport> {
    return this.validationService.validatePipeline(pipelineId);
  }
}
