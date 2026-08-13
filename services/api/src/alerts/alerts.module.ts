import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { UserModule } from '../user/user.module';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [UserModule, MarketDataModule],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}