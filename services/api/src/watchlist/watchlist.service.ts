import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // CONFIRM path matches your project
import { MarketDataService } from '../market-data/market-data.service'; // CONFIRM path
import { AddWatchlistItemDto } from './dto/add-watchlist-item.dto';
import { ReorderWatchlistDto } from './dto/reorder-watchlist.dto';

type SupportedAssetType = 'crypto' | 'equity' | 'forex' | 'metal' | 'oil';

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketData: MarketDataService,
  ) {}

  private async resolveUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.id;
  }

  // Duplicates the switch logic from MarketDataController.dispatchPrice —
  // flagged as tech debt. Should eventually be extracted into a single
  // public method on MarketDataService so both controllers/services share it.
  private async getPriceFor(assetType: SupportedAssetType, symbol: string): Promise<number | null> {
    switch (assetType) {
      case 'crypto':
        return this.marketData.getCryptoPriceUsd(symbol);
      case 'equity':
        return this.marketData.getEquityPriceUsd(symbol);
      case 'forex':
        return this.marketData.getForexRate(symbol);
      case 'metal':
        return this.marketData.getMetalPriceUsd(symbol);
      case 'oil':
        return this.marketData.getOilPriceUsd(symbol as 'WTI' | 'BRENT');
      default:
        throw new BadRequestException(`Unsupported assetType: ${assetType}`);
    }
  }

  async list(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);

    const items = await this.prisma.watchlistItem.findMany({
      where: { userId },
      include: { instrument: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Fetch prices in parallel, never let one failure kill the whole list.
    const withPrices = await Promise.all(
      items.map(async (item) => {
        try {
          const price = await this.getPriceFor(
            item.instrument.assetType as SupportedAssetType,
            item.instrument.symbol,
          );
          if (price === null) {
            return { ...item, price: null, priceUnavailable: true, reason: 'Provider returned no price' };
          }
          return { ...item, price, priceUnavailable: false };
        } catch (err) {
          return {
            ...item,
            price: null,
            priceUnavailable: true,
            reason: err instanceof Error ? err.message : 'Price lookup failed',
          };
        }
      }),
    );

    return withPrices;
  }

  async add(clerkId: string, dto: AddWatchlistItemDto) {
    const userId = await this.resolveUserId(clerkId);
    const assetType = dto.assetType as SupportedAssetType;

    let instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol: dto.symbol, assetType: dto.assetType } },
      // CONFIRM: Prisma's compound-unique field name — for @@unique([symbol, assetType])
      // this is usually auto-named symbol_assetType, but verify against the generated
      // client types (or just run `npx prisma generate` and check autocomplete) before
      // relying on this exact key name.
    });

    if (!instrument) {
      const price = await this.getPriceFor(assetType, dto.symbol);
      if (price === null) {
        throw new BadRequestException(`Symbol "${dto.symbol}" is not supported for assetType "${dto.assetType}"`);
      }

      instrument = await this.prisma.instrument.create({
        data: {
          symbol: dto.symbol,
          assetType: dto.assetType,
          name: dto.symbol, // CONFIRM: no separate "name" source available yet (e.g. "Apple Inc." vs "AAPL") —
          // using symbol as a placeholder name. Real display names would need a provider
          // lookup we don't have yet (part of Phase 2b's search/metadata work).
        },
      });
    }

    const existing = await this.prisma.watchlistItem.findUnique({
      where: { userId_instrumentId: { userId, instrumentId: instrument.id } },
      // CONFIRM: same compound-unique naming caveat as above, for @@unique([userId, instrumentId])
    });
    if (existing) {
      throw new ConflictException('Symbol already on watchlist');
    }

    const maxOrder = await this.prisma.watchlistItem.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return this.prisma.watchlistItem.create({
      data: { userId, instrumentId: instrument.id, sortOrder: nextOrder },
      include: { instrument: true },
    });
  }

  async remove(clerkId: string, symbol: string, assetType: string) {
    const userId = await this.resolveUserId(clerkId);

    const instrument = await this.prisma.instrument.findUnique({
      where: { symbol_assetType: { symbol, assetType } },
    });
    if (!instrument) {
      throw new NotFoundException('Symbol not found');
    }

    const existing = await this.prisma.watchlistItem.findUnique({
      where: { userId_instrumentId: { userId, instrumentId: instrument.id } },
    });
    if (!existing) {
      throw new NotFoundException('Symbol not on watchlist');
    }

    await this.prisma.watchlistItem.delete({ where: { id: existing.id } });
    return { removed: true };
  }

  async reorder(clerkId: string, dto: ReorderWatchlistDto) {
    const userId = await this.resolveUserId(clerkId);

    const currentItems = await this.prisma.watchlistItem.findMany({ where: { userId } });
    const currentIds = new Set(currentItems.map((i) => i.id));
    const requestedIds = new Set(dto.orderedItemIds);

    const sameSize = currentIds.size === requestedIds.size;
    const sameMembers = [...currentIds].every((id) => requestedIds.has(id));
    if (!sameSize || !sameMembers) {
      throw new BadRequestException('orderedItemIds must exactly match your current watchlist items');
    }

    await this.prisma.$transaction(
      dto.orderedItemIds.map((id, index) =>
        this.prisma.watchlistItem.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    return this.list(clerkId);
  }
}