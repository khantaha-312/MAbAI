import { Module } from '@nestjs/common';
import { RiskEngineController } from './risk-engine.controller';
import { RiskEngineService } from './risk-engine.service';
import { UserModule } from '../user/user.module';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [UserModule, MarketDataModule],
  controllers: [RiskEngineController],
  providers: [RiskEngineService],
})
export class RiskEngineModule {}