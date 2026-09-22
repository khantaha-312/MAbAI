import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { MarketDataCacheService } from '../market-data/market-data-cache.service';

describe('WatchlistService', () => {
  let service: WatchlistService;
  let prisma: any;
  let marketData: any;
  let cacheService: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      instrument: { findUnique: jest.fn(), create: jest.fn() },
      watchlistItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    
    marketData = {
      getCryptoPriceUsd: jest.fn(),
      getEquityPriceUsd: jest.fn(),
      getForexRate: jest.fn(),
      getMetalPriceUsd: jest.fn(),
      getOilPriceUsd: jest.fn(),
    };

    cacheService = {
      get: jest.fn((key, fn) => fn()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistService,
        { provide: PrismaService, useValue: prisma },
        { provide: MarketDataService, useValue: marketData },
        { provide: MarketDataCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<WatchlistService>(WatchlistService);
  });

  describe('add()', () => {
    it('creates a new Instrument only after a successful price check', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.instrument.findUnique.mockResolvedValue(null);
      marketData.getEquityPriceUsd.mockResolvedValue(214.32);
      prisma.instrument.create.mockResolvedValue({ id: 'instr-1', symbol: 'AAPL', assetType: 'equity' });
      prisma.watchlistItem.findUnique.mockResolvedValue(null);
      prisma.watchlistItem.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      prisma.watchlistItem.create.mockResolvedValue({ id: 'wi-1' });

      await service.add('clerk-1', { symbol: 'AAPL', assetType: 'equity' } as any);

      expect(marketData.getEquityPriceUsd).toHaveBeenCalledWith('AAPL');
      expect(prisma.instrument.create).toHaveBeenCalled();
    });

    it('throws 400 and does NOT create an Instrument when price is null', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.instrument.findUnique.mockResolvedValue(null);
      marketData.getEquityPriceUsd.mockResolvedValue(null);

      await expect(
        service.add('clerk-1', { symbol: 'ZZZZNOTREAL', assetType: 'equity' } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.instrument.create).not.toHaveBeenCalled();
    });

    it('throws 409 if already on watchlist', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
      prisma.watchlistItem.findUnique.mockResolvedValue({ id: 'wi-1' });

      await expect(
        service.add('clerk-1', { symbol: 'AAPL', assetType: 'equity' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('list()', () => {
    it('returns priceUnavailable true instead of throwing when a price call fails', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.watchlistItem.findMany.mockResolvedValue([
        { id: 'wi-1', sortOrder: 0, instrument: { id: 'i1', symbol: 'AAPL', assetType: 'equity' } },
      ]);
      marketData.getEquityPriceUsd.mockRejectedValue(new Error('provider timeout'));

      const result = await service.list('clerk-1');

      expect(result[0].priceUnavailable).toBe(true);
      expect(result[0].price).toBeNull();
    });

    it('returns priceUnavailable true (not an error) when provider returns null', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.watchlistItem.findMany.mockResolvedValue([
        { id: 'wi-1', sortOrder: 0, instrument: { id: 'i1', symbol: 'ZZZ', assetType: 'equity' } },
      ]);
      marketData.getEquityPriceUsd.mockResolvedValue(null);

      const result = await service.list('clerk-1');

      expect(result[0].priceUnavailable).toBe(true);
    });
  });

  describe('remove()', () => {
    it('throws 404 for unknown symbol/assetType', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.instrument.findUnique.mockResolvedValue(null);

      await expect(service.remove('clerk-1', 'ZZZ', 'equity')).rejects.toThrow(NotFoundException);
    });

    it('throws 404 if instrument exists but is not on this user\'s watchlist', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.instrument.findUnique.mockResolvedValue({ id: 'instr-1' });
      prisma.watchlistItem.findUnique.mockResolvedValue(null);

      await expect(service.remove('clerk-1', 'AAPL', 'equity')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder()', () => {
    it('throws 400 if the id set does not match the user\'s actual items', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.watchlistItem.findMany.mockResolvedValue([{ id: 'wi-1' }, { id: 'wi-2' }]);

      await expect(
        service.reorder('clerk-1', { orderedItemIds: ['wi-1', 'someone-elses-item'] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an id list containing another user\'s WatchlistItem id', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.watchlistItem.findMany.mockResolvedValue([{ id: 'wi-owned-by-2' }]);

      await expect(
        service.reorder('clerk-2', { orderedItemIds: ['wi-owned-by-2', 'wi-owned-by-someone-else'] } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});