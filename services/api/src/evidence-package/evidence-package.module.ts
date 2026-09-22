import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { TechnicalAnalysisModule } from '../technical-analysis/technical-analysis.module';
import { PriceBarModule } from '../price-bar/price-bar.module';
import { NewsSentimentModule } from '../news-sentiment/news-sentiment.module';
import { EvidencePackageController } from './evidence-package.controller';
import { EvidencePackageService } from './evidence-package.service';

@Module({
  imports: [
    UserModule,
    MarketDataModule,
    TechnicalAnalysisModule,
    PriceBarModule,
    NewsSentimentModule,
  ],
  controllers: [EvidencePackageController],
  providers: [EvidencePackageService],
  exports: [EvidencePackageService],
})
export class EvidencePackageModule {}