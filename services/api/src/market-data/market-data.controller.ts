import { Controller, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

type AssetClass = 'crypto' | 'equity' | 'forex' | 'metal' | 'oil';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('price/:assetClass/:symbol')
  async getPrice(@Param('assetClass') assetClass: AssetClass, @Param('symbol') symbol: string) {
    const price = await this.dispatchPrice(assetClass, symbol);
    return { assetClass, symbol, price };
  }

  @Get('history/:assetClass/:symbol')
  async getHistory(
    @Param('assetClass') assetClass: AssetClass,
    @Param('symbol') symbol: string,
    @Query('days') days?: string,
  ) {
    const dayCount = days ? parseInt(days, 10) : 30;
    const bars = await this.dispatchHistory(assetClass, symbol, dayCount);
    return { assetClass, symbol, days: dayCount, bars };
  }

  private async dispatchPrice(assetClass: AssetClass, symbol: string): Promise<number | null> {
    switch (assetClass) {
      case 'crypto':
        return this.marketDataService.getCryptoPriceUsd(symbol);
      case 'equity':
        return this.marketDataService.getEquityPriceUsd(symbol);
      case 'forex':
        return this.marketDataService.getForexRate(symbol);
      case 'metal':
        return this.marketDataService.getMetalPriceUsd(symbol);
      case 'oil':
        return this.marketDataService.getOilPriceUsd(symbol as 'WTI' | 'BRENT');
      default:
        throw new BadRequestException(`Unsupported assetClass: ${assetClass}`);
    }
  }

  private async dispatchHistory(assetClass: AssetClass, symbol: string, days: number) {
    switch (assetClass) {
      case 'equity':
        return this.marketDataService.getEquityHistoricalPricesUsd(symbol, days);
      default:
        throw new BadRequestException(`Historical data not yet wired for assetClass: ${assetClass}`);
    }
  }
}