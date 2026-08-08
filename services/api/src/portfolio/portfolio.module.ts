import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { UserModule } from '../user/user.module';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [UserModule, MarketDataModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}