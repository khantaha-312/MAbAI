import { Module } from '@nestjs/common';
import { EvidencePackageModule } from '../evidence-package/evidence-package.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { PredictionLedgerModule } from '../prediction-ledger/prediction-ledger.module';
import { MarketDataTool } from './market-data.tool';
import { RiskEngineTool } from './risk-engine.tool';
import { PredictionLedgerTool } from './prediction-ledger.tool';

// ASSUMPTION FLAGGED: module file names/paths here
// (evidence-package.module.ts, risk-engine.module.ts,
// prediction-ledger.module.ts) follow the same convention as every other
// module in this project, and each already exports its respective service
// (they must, since AiOrchestrationService already injects
// EvidencePackageService directly). Not verified against real files — if
// this doesn't compile, paste the real module files and I'll fix the
// imports, per "never guess an existing file's shape."
@Module({
  imports: [EvidencePackageModule, RiskEngineModule, PredictionLedgerModule],
  providers: [MarketDataTool, RiskEngineTool, PredictionLedgerTool],
  exports: [MarketDataTool, RiskEngineTool, PredictionLedgerTool],
})
export class AiToolsModule {}