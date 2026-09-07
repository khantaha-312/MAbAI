import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { MacroAnalysisController } from './macro-analysis.controller';
import { MacroAnalysisService } from './macro-analysis.service';

@Module({
  imports: [UserModule, MarketDataModule],
  controllers: [MacroAnalysisController],
  providers: [MacroAnalysisService],
  exports: [MacroAnalysisService],
})
export class MacroAnalysisModule {}