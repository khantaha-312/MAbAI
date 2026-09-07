import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NewsSentimentController } from './news-sentiment.controller';
import { NewsSentimentService } from './news-sentiment.service';

@Module({
  imports: [UserModule, MarketDataModule],
  controllers: [NewsSentimentController],
  providers: [NewsSentimentService],
  exports: [NewsSentimentService],
})
export class NewsSentimentModule {}