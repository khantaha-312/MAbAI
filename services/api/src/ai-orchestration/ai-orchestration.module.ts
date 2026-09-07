import { Module } from '@nestjs/common';
import { AiOrchestrationController } from './ai-orchestration.controller';
import { SymbolNarrativeController } from './symbol-narrative.controller';
import { AiOrchestrationService } from './ai-orchestration.service';
import { ModelProviderService } from './model-provider.service';
import { GeminiProvider } from './gemini.provider';
import { UserModule } from '../user/user.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PredictionLedgerModule } from '../prediction-ledger/prediction-ledger.module';
import { EvidencePackageModule } from '../evidence-package/evidence-package.module';
import { MacroAnalysisModule } from '../macro-analysis/macro-analysis.module';

@Module({
  imports: [
    UserModule,
    PortfolioModule,
    PredictionLedgerModule,
    EvidencePackageModule,
    MacroAnalysisModule,
  ],
  controllers: [AiOrchestrationController, SymbolNarrativeController],
  providers: [AiOrchestrationService, ModelProviderService, GeminiProvider],
  exports: [ModelProviderService],
})
export class AiOrchestrationModule {}