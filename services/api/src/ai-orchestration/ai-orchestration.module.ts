import { Module } from '@nestjs/common';
import { AiOrchestrationController } from './ai-orchestration.controller';
import { AiOrchestrationService } from './ai-orchestration.service';
import { ModelProviderService } from './model-provider.service';
import { UserModule } from '../user/user.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PredictionLedgerModule } from '../prediction-ledger/prediction-ledger.module';

@Module({
  imports: [UserModule, PortfolioModule, PredictionLedgerModule],
  controllers: [AiOrchestrationController],
  providers: [AiOrchestrationService, ModelProviderService],
})
export class AiOrchestrationModule {}