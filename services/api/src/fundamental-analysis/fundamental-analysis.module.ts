import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { MarketDataModule } from '../market-data/market-data.module'; // provides FinnhubAdapter — CONFIRM it's exported there
import { FundamentalAnalysisController } from './fundamental-analysis.controller';
import { FundamentalAnalysisService } from './fundamental-analysis.service';

@Module({
  imports: [UserModule, MarketDataModule],
  controllers: [FundamentalAnalysisController],
  providers: [FundamentalAnalysisService],
  exports: [FundamentalAnalysisService],
})
export class FundamentalAnalysisModule {}