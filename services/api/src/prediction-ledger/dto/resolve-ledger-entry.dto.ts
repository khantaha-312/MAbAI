import { IsIn, IsObject } from 'class-validator';

export class ResolveLedgerEntryDto {
  @IsIn(['correct', 'incorrect', 'partial'])
  outcome!: 'correct' | 'incorrect' | 'partial';

  @IsObject()
  actualData!: Record<string, unknown>;
}