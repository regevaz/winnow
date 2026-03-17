export class PipelineStageDto {
  externalId!: string;
  name!: string;
  displayOrder!: number;
  probability!: number;
  isClosed!: boolean;
  isWon!: boolean;
}

export class PipelineListDto {
  externalId!: string;
  name!: string;
  stageCount!: number;
  stages!: PipelineStageDto[];
}
