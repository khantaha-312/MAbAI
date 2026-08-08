import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { UserModule } from '../user/user.module';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [UserModule, MarketDataModule],
  controllers: [HealthController],
})
export class HealthModule {}