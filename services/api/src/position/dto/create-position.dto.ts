import { IsString, IsNumberString } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  instrumentId!: string;

  @IsNumberString()
  quantity!: string;

  @IsNumberString()
  avgCostBasis!: string;
}