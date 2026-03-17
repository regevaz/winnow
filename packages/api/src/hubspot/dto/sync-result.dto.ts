export class SyncResultDto {
  dealsUpserted!: number;
  pipelinesUpserted!: number;
  stagesUpserted!: number;
  durationMs!: number;
  syncedAt!: string;
}
