import { IsIn, IsObject, IsString } from 'class-validator';

export class CreateAlertRuleDto {
  @IsIn(['PRICE_ABOVE', 'PRICE_BELOW'])
  type!: 'PRICE_ABOVE' | 'PRICE_BELOW';

  @IsString()
  instrumentSymbol!: string;

  @IsObject()
  config!: { threshold: number };
}