import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { InstrumentsController } from './instruments.controller';
import { InstrumentsService } from './instruments.service';

@Module({
  imports: [UserModule, MarketDataModule],
  controllers: [InstrumentsController],
  providers: [InstrumentsService],
})
export class InstrumentsModule {}