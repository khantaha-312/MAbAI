import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { NewsSentimentService } from './news-sentiment.service';

@Controller('news-sentiment')
@UseGuards(ClerkAuthGuard)
export class NewsSentimentController {
  constructor(private readonly newsSentimentService: NewsSentimentService) {}

  @Get(':symbol')
  async getNews(
    @Param('symbol') symbol: string,
    @Query('includeSentiment') includeSentiment?: string,
  ) {
    const result = await this.newsSentimentService.getNewsAndSentiment(
      symbol,
      includeSentiment === 'true',
    );
    return { data: result };
  }
}