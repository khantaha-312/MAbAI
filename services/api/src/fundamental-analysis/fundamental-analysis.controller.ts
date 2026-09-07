import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { FundamentalAnalysisService } from './fundamental-analysis.service';

@Controller('fundamental-analysis')
@UseGuards(ClerkAuthGuard)
export class FundamentalAnalysisController {
  constructor(private readonly fundamentalAnalysisService: FundamentalAnalysisService) {}

  @Get(':symbol')
  async getFundamentals(@Param('symbol') symbol: string) {
    const result = await this.fundamentalAnalysisService.getFundamentals(symbol);
    return { data: result };
  }
}