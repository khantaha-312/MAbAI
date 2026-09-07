import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { ChatRagService } from './chat-rag.service';

interface ChatRequestBody {
  question: string;
}

@Controller('chat')
@UseGuards(ClerkAuthGuard)
export class ChatController {
  constructor(private readonly chatRagService: ChatRagService) {}

  @Post('ask')
  async ask(@Req() req: any, @Body() body: ChatRequestBody) {
    // NOTE: how the real userId is attached to the request by
    // ClerkAuthGuard is assumed here as req.user.id, matching the
    // convention implied by every other service in this codebase taking
    // a raw userId string (e.g. PredictionLedgerService.resolve(entry.id,
    // entry.userId, ...)). Confirm against the real guard implementation
    // before trusting this — if it's req.auth.userId or similar instead,
    // this needs a one-line fix.
    const userId = req.user?.id;
    const result = await this.chatRagService.handleChatTurn(userId, body.question);
    return { data: result };
  }
}