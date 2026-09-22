import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  imports: [UserModule, PrismaModule, MarketDataModule],
  controllers: [WatchlistController],
  providers: [WatchlistService],
})
export class WatchlistModule {}