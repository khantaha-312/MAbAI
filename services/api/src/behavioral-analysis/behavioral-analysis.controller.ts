import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import type { User } from '@prisma/client';

@Controller('behavioral-analysis')
@UseGuards(ClerkAuthGuard)
export class BehavioralAnalysisController {
  constructor(private readonly behavioralAnalysisService: BehavioralAnalysisService) {}

  @Get()
  async getAnalysis(@CurrentUser() user: User) {
    const result = await this.behavioralAnalysisService.getBehavioralAnalysis(user.id);
    return { data: result };
  }
}