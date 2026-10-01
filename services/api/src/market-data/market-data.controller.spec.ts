import { ReflectMetadata } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

describe('MarketDataController', () => {
  const marketDataService = {
    getCryptoPriceUsd: jest.fn(),
    getEquityPriceUsd: jest.fn(),
    getForexRate: jest.fn(),
    getMetalPriceUsd: jest.fn(),
    getOilPriceUsd: jest.fn(),
    getEquityHistoricalPricesUsd: jest.fn(),
  };

  let controller: MarketDataController;

  beforeEach(() => {
    controller = new MarketDataController(marketDataService as unknown as MarketDataService);
    jest.clearAllMocks();
  });

  it('is protected by ClerkAuthGuard', () => {
    const guards = Reflect.getMetadata('__guards__', MarketDataController);
    expect(guards).toBeDefined();
    const guardClasses = guards.map((guard: any) => guard.name);
    expect(guardClasses).toContain('ClerkAuthGuard');
  });

  it('preserves GET /market-data/price/:assetClass/:symbol route', async () => {
    marketDataService.getEquityPriceUsd.mockResolvedValue(150.25);
    const result = await controller.getPrice('equity', 'AAPL');
    expect(result).toEqual({ assetClass: 'equity', symbol: 'AAPL', price: 150.25 });
  });

  it('preserves GET /market-data/history/:assetClass/:symbol route', async () => {
    const bars = [{ date: '2024-01-01', open: 150, high: 155, low: 149, close: 152, volume: 1000000 }];
    marketDataService.getEquityHistoricalPricesUsd.mockResolvedValue(bars);
    const result = await controller.getHistory('equity', 'AAPL', '30');
    expect(result).toEqual({ assetClass: 'equity', symbol: 'AAPL', days: 30, bars });
  });
});
