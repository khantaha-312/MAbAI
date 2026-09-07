  import { Controller, Param, Post, UseGuards } from '@nestjs/common';
  import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
  import { CurrentUser } from '../auth/current-user.decorator';
  import { AiOrchestrationService } from './ai-orchestration.service';
  import type { User } from '@prisma/client';

  @Controller('portfolios/:portfolioId/ai-narrative')
  @UseGuards(ClerkAuthGuard)
  export class AiOrchestrationController {
    constructor(private readonly aiOrchestrationService: AiOrchestrationService) {}

    @Post()
    async generate(
      @CurrentUser() user: User,
      @Param('portfolioId') portfolioId: string,
    ) {
      const result = await this.aiOrchestrationService.generateNarrativeForPortfolio(
        portfolioId,
        user.id,
      );
      return { data: result };
    }
  }