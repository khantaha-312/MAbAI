import { IsObject, IsString } from 'class-validator';

export class CreateLedgerEntryDto {
  @IsObject()
  inputSnapshot!: Record<string, unknown>;

  @IsObject()
  generatedOutput!: Record<string, unknown>;

  @IsString()
  modelProvider!: string;

  @IsString()
  modelName!: string;
}