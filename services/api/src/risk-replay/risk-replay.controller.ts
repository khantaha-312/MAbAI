import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RiskReplayService } from './risk-replay.service';
import type { User } from '@prisma/client';

@Controller('risk-replay')
@UseGuards(ClerkAuthGuard)
export class RiskReplayController {
  constructor(private readonly riskReplayService: RiskReplayService) {}

  @Get(':id')
  async getReplay(@CurrentUser() user: User, @Param('id') id: string) {
    const result = await this.riskReplayService.getReplay(id, user.id);
    return { data: result };
  }
}