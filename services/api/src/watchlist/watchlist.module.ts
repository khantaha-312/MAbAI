import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module'; // CONFIRM path matches profile.module.ts
import { PrismaModule } from '../prisma/prisma.module'; // CONFIRM path matches profile.module.ts
import { MarketDataModule } from '../market-data/market-data.module'; // CONFIRM exact name/path — check the file that exports MarketDataService
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  imports: [UserModule, PrismaModule, MarketDataModule],
  controllers: [WatchlistController],
  providers: [WatchlistService],
})
export class WatchlistModule {}