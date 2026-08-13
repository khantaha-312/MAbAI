import { Controller, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PriceBarService } from './price-bar.service';

@Controller('price-bars')
@UseGuards(ClerkAuthGuard)
export class PriceBarController {
  constructor(private readonly priceBarService: PriceBarService) {}

  @Post('backfill/equity/:symbol')
  async backfillEquity(@Param('symbol') symbol: string, @Query('days') days?: string) {
    const dayCount = days ? parseInt(days, 10) : 30;
    const result = await this.priceBarService.backfillEquityHistory(symbol, dayCount);
    return { data: result };
  }

  @Post('backfill/crypto/:coinId')
  async backfillCrypto(@Param('coinId') coinId: string, @Query('days') days?: string) {
    const dayCount = days ? parseInt(days, 10) : 30;
    const result = await this.priceBarService.backfillCryptoHistory(coinId, dayCount);
    return { data: result };
  }
}