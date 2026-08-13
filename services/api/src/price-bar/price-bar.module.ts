import { Module } from '@nestjs/common';
import { PriceBarService } from './price-bar.service';
import { PriceBarController } from './price-bar.controller';
import { MarketDataModule } from '../market-data/market-data.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [MarketDataModule, UserModule],
  controllers: [PriceBarController],
  providers: [PriceBarService],
  exports: [PriceBarService],
})
export class PriceBarModule {}