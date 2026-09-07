import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TechnicalAnalysisService } from './technical-analysis.service';

@Controller('technical-analysis')
@UseGuards(ClerkAuthGuard)
export class TechnicalAnalysisController {
  constructor(private readonly technicalAnalysisService: TechnicalAnalysisService) {}

  @Get('rsi/:assetType/:symbol')
  async getRsi(
    @Param('assetType') assetType: string,
    @Param('symbol') symbol: string,
    @Query('period') period?: string,
  ) {
    const result = await this.technicalAnalysisService.getRsi(
      symbol,
      assetType,
      period ? parseInt(period, 10) : 14,
    );
    return { data: result };
  }
  @Get('sma/:assetType/:symbol')
  async getSma(
    @Param('assetType') assetType: string,
    @Param('symbol') symbol: string,
    @Query('periods') periods?: string,
  ) {
    const periodList = periods
      ? periods.split(',').map((p) => parseInt(p.trim(), 10))
      : [20, 50, 100, 200];

    const result = await this.technicalAnalysisService.getSmaSet(symbol, assetType, periodList);
    return { data: result };
  }
  @Get('ema/:assetType/:symbol')
  async getEma(
    @Param('assetType') assetType: string,
    @Param('symbol') symbol: string,
    @Query('periods') periods?: string,
  ) {
    const periodList = periods
      ? periods.split(',').map((p) => parseInt(p.trim(), 10))
      : [12, 26, 50, 200];

    const result = await this.technicalAnalysisService.getEmaSet(symbol, assetType, periodList);
    return { data: result };
  }
  @Get('macd/:assetType/:symbol')
  async getMacd(
    @Param('assetType') assetType: string,
    @Param('symbol') symbol: string,
    @Query('fastPeriod') fastPeriod?: string,
    @Query('slowPeriod') slowPeriod?: string,
    @Query('signalPeriod') signalPeriod?: string,
  ) {
    const result = await this.technicalAnalysisService.getMacd(
      symbol,
      assetType,
      fastPeriod ? parseInt(fastPeriod, 10) : 12,
      slowPeriod ? parseInt(slowPeriod, 10) : 26,
      signalPeriod ? parseInt(signalPeriod, 10) : 9
    );
    return { data: result };
  }
  @Get('bollinger/:assetType/:symbol')
  async getBollinger(
    @Param('assetType') assetType: string,
    @Param('symbol') symbol: string,
    @Query('period') period?: string,
  ) {
    const result = await this.technicalAnalysisService.getBollinger(
      symbol,
      assetType,
      period ? parseInt(period, 10) : 20,
    );
    return { data: result };
  }
  @Get('atr/:assetType/:symbol')
  async getAtr(
    @Param('assetType') assetType: string,
    @Param('symbol') symbol: string,
    @Query('period') period?: string,
  ) {
    const result = await this.technicalAnalysisService.getAtr(
      symbol,
      assetType,
      period ? parseInt(period, 10) : 14,
    );
    return { data: result };
  }
  @Get('volume/:assetType/:symbol')
  async getVolume(
    @Param('assetType') assetType: string,
    @Param('symbol') symbol: string,
    @Query('period') period?: string,
  ) {
    const result = await this.technicalAnalysisService.getVolumeAnalysis(
      symbol,
      assetType,
      period ? parseInt(period, 10) : 20,
    );
    return { data: result };
  }
    @Get('trend/:assetType/:symbol')
  async getTrend(@Param('assetType') assetType: string, @Param('symbol') symbol: string) {
    const result = await this.technicalAnalysisService.getTrend(symbol, assetType);
    return { data: result };
  }
  @Get(':assetType/:symbol')
  async getAggregate(@Param('assetType') assetType: string, @Param('symbol') symbol: string) {
    const result = await this.technicalAnalysisService.getAggregate(symbol, assetType);
    return { data: result };
  }
}