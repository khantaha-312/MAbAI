import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RiskEngineService } from './risk-engine.service';
import type { User } from '@prisma/client';

@Controller('portfolios/:portfolioId/risk-flags')
@UseGuards(ClerkAuthGuard)
export class RiskEngineController {
  constructor(private readonly riskEngineService: RiskEngineService) {}

  @Post('evaluate')
  async evaluate(
    @CurrentUser() user: User,
    @Param('portfolioId') portfolioId: string,
  ) {
    const flags = await this.riskEngineService.evaluatePortfolio(
      portfolioId,
      user.id,
    );
    return { data: flags };
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Param('portfolioId') portfolioId: string,
  ) {
    const flags = await this.riskEngineService.findFlagsForPortfolio(
      portfolioId,
      user.id,
    );
    return { data: flags };
  }
}