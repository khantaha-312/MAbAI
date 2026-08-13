import { Module } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { CoinGeckoAdapter } from './coingecko.adapter';
import { FinnhubAdapter } from './finnhub.adapter';
import { AlphaVantageAdapter } from './alphavantage.adapter';
import { EiaAdapter } from './eia.adapter';
import { GoldApiAdapter } from './goldapi.adapter';
import { FrankfurterAdapter } from './frankfurter.adapter';
import {
  COINGECKO_PROVIDER,
  FINNHUB_PROVIDER,
  ALPHA_VANTAGE_PROVIDER,
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
    EiaAdapter,
    GoldApiAdapter,
    FrankfurterAdapter,
    { provide: COINGECKO_PROVIDER, useClass: CoinGeckoAdapter },
    { provide: FINNHUB_PROVIDER, useClass: FinnhubAdapter },
    { provide: ALPHA_VANTAGE_PROVIDER, useClass: AlphaVantageAdapter },
    { provide: EIA_PROVIDER, useClass: EiaAdapter },
    { provide: GOLD_API_PROVIDER, useClass: GoldApiAdapter },
    { provide: FRANKFURTER_PROVIDER, useClass: FrankfurterAdapter },
    MarketDataService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}