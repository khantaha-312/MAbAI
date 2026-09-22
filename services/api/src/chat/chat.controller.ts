import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { ChatRagService } from './chat-rag.service';
import { GrowthComparisonService } from './growth-comparison.service';

interface ChatRequestBody {
  question: string;
}

@Controller('chat')
@UseGuards(ClerkAuthGuard)
export class ChatController {
  constructor(
    private readonly chatRagService: ChatRagService,
    private readonly growthComparisonService: GrowthComparisonService,
  ) {}

  @Post('ask')
  async ask(@Req() req: any, @Body() body: ChatRequestBody) {
    const userId = req.user?.id;
    const result = await this.chatRagService.handleChatTurn(userId, body.question);
    return { data: result };
  }

  @Get('growth/compare')
  async compareGrowth(
    @Req() req: any,
    @Query('fromDate') fromDateStr: string,
    @Query('toDate') toDateStr: string,
    @Query('narrative') narrativeStr?: string,
  ) {
    const userId = req.user?.id;
    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('fromDate and toDate must be valid ISO date strings');
    }
    if (fromDate > toDate) {
      throw new BadRequestException('fromDate must be before toDate');
    }

    // Defaults to true (existing behavior unchanged) — pass
    // ?narrative=false to skip the LLM call for callers that only need
    // structured data quickly.
    const includeNarrative = narrativeStr !== 'false';

    const result = await this.growthComparisonService.compare(
      userId,
      fromDate,
      toDate,
      includeNarrative,
    );
    return { data: result };
  }
}