import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatRagService } from './chat-rag.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileModule } from '../profile/profile.module';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { UserModule } from '../user/user.module';
import { GrowthComparisonService } from './growth-comparison.service';
import { KnowledgeConsolidationJob } from './knowledge-consolidation.job';

@Module({
  imports: [PrismaModule, ProfileModule, AiOrchestrationModule, UserModule],
  controllers: [ChatController],
  providers: [ChatRagService, GrowthComparisonService, KnowledgeConsolidationJob],
})
export class ChatModule {}