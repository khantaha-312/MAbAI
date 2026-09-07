import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { TradingType, TradingStyle, AssetClass, InvestmentPlan, RiskAppetite } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsArray()
  @IsEnum(TradingType, { each: true })
  tradingType?: TradingType[];

  @IsOptional()
  @IsArray()
  @IsEnum(TradingStyle, { each: true })
  tradingStyle?: TradingStyle[];

  @IsOptional()
  @IsArray()
  @IsEnum(AssetClass, { each: true })
  assetClasses?: AssetClass[];

  @IsOptional()
  @IsArray()
  @IsEnum(InvestmentPlan, { each: true })
  investmentPlan?: InvestmentPlan[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSymbols?: string[];

  @IsOptional()
  onboardingDetails?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;

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