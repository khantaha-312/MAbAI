import { Module } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { CoinGeckoAdapter } from './coingecko.adapter';
import { FinnhubAdapter } from './finnhub.adapter';
import { AlphaVantageAdapter } from './alphavantage.adapter';
import { EiaAdapter } from './eia.adapter';
import { GoldApiAdapter } from './goldapi.adapter';
import { FrankfurterAdapter } from './frankfurter.adapter';
import {BinanceAdapter} from './binance.adapter';
import { MarketDataCacheService } from './market-data-cache.service';
import { ApiBudgetTrackerService } from './api-budget-tracker.service';


import {
  COINGECKO_PROVIDER,
  FINNHUB_PROVIDER,
  ALPHA_VANTAGE_PROVIDER,
  BINANCE_PROVIDER,
  EIA_PROVIDER,
  GOLD_API_PROVIDER,
  FRANKFURTER_PROVIDER,
} from './market-data-provider.interface';

@Module({
  controllers: [MarketDataController],
  providers: [
    CoinGeckoAdapter,
    FinnhubAdapter,
    AlphaVantageAdapter,
    BinanceAdapter,
    EiaAdapter,
    GoldApiAdapter,
    FrankfurterAdapter,
    MarketDataCacheService,
    ApiBudgetTrackerService,
    { provide: COINGECKO_PROVIDER, useClass: CoinGeckoAdapter },
    { provide: FINNHUB_PROVIDER, useClass: FinnhubAdapter },
    { provide: ALPHA_VANTAGE_PROVIDER, useClass: AlphaVantageAdapter },
    { provide: BINANCE_PROVIDER, useClass: BinanceAdapter },
    { provide: EIA_PROVIDER, useClass: EiaAdapter },
    { provide: GOLD_API_PROVIDER, useClass: GoldApiAdapter },
    { provide: FRANKFURTER_PROVIDER, useClass: FrankfurterAdapter },
    MarketDataService,
  ],
  exports: [MarketDataService, MarketDataCacheService],
})
export class MarketDataModule {}