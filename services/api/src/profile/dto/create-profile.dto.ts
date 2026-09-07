import { IsArray, IsEnum, IsOptional, IsString, ArrayNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { TradingType, TradingStyle, AssetClass, InvestmentPlan, RiskAppetite } from '@prisma/client';

export class CreateProfileDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TradingType, { each: true })
  tradingType: TradingType[];

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TradingStyle, { each: true })
  tradingStyle: TradingStyle[];

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AssetClass, { each: true })
  assetClasses: AssetClass[];

  @IsOptional()
  @IsArray()
  @IsEnum(InvestmentPlan, { each: true })
  investmentPlan?: InvestmentPlan[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  selectedSymbols?: string[];

  @IsOptional()
  onboardingDetails?: Record<string, any>;

  @IsOptional()
  @IsEnum(RiskAppetite)
  riskAppetite?: RiskAppetite;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLeverageTolerance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  typicalPositionSizePct?: number;
}