import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AiOrchestrationService } from './ai-orchestration.service';
import type { User } from '@prisma/client';

@Controller('ai-orchestration/narrative')
@UseGuards(ClerkAuthGuard)
export class SymbolNarrativeController {
  constructor(private readonly aiOrchestrationService: AiOrchestrationService) {}

  @Post(':assetType/:symbol')
  async generate(
    @CurrentUser() user: User,
    @Param('assetType') assetType: string,
    @Param('symbol') symbol: string,
  ) {
    const result = await this.aiOrchestrationService.generateSymbolNarrative(symbol, assetType, user.id);
    return { data: result };
  }
}
