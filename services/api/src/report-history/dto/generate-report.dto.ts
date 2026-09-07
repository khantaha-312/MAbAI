import { IsArray, IsEnum, IsIn, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';
import { TradingType, TradingStyle, RiskAppetite, InvestmentPlan } from '@prisma/client';

export const KNOWN_ASSET_TYPES = ['crypto', 'equity', 'forex', 'metal', 'oil'] as const;

export class GenerateReportDto {
  @IsString()
  symbol: string;

  @IsIn(KNOWN_ASSET_TYPES)
  assetType: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TradingType, { each: true })
  tradingType: TradingType[];

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TradingStyle, { each: true })
  tradingStyle: TradingStyle[];

  @IsOptional()
  @IsEnum(RiskAppetite)
  riskAppetite?: RiskAppetite;

  @IsOptional()
  @IsArray()
  @IsEnum(InvestmentPlan, { each: true })
  investmentPlan?: InvestmentPlan[];
}