import { Injectable } from '@nestjs/common';
import { AiTool } from './ai-tool.interface';
import { RiskEngineService } from '../risk-engine/risk-engine.service';

export interface RiskEngineToolInput {
  portfolioId: string;
  userId: string;
}

// Return type isn't separately exported by RiskEngineService, so we derive
// it directly from the real method rather than redeclaring/guessing the
// shape by hand — stays correct automatically if that method's return
// shape changes.
export type RiskEngineToolOutput = Awaited<ReturnType<RiskEngineService['getRiskAnalysis']>>;

/**
 * Thin AiTool wrapper around RiskEngineService.getRiskAnalysis (the
 * read-only snapshot method — NOT evaluatePortfolio, which writes RiskFlag
 * rows as a side effect and has no place being triggered as a read tool
 * inside an AI prompt-building flow). Zero new logic.
 */
@Injectable()
export class RiskEngineTool implements AiTool<RiskEngineToolInput, RiskEngineToolOutput> {
  readonly name = 'risk_engine';
  readonly description =
    'Retrieves a read-only risk analysis snapshot for a portfolio: exposure by asset class, volatility contributions, and an overall severity assessment.';

  constructor(private readonly riskEngineService: RiskEngineService) {}

  async execute(input: RiskEngineToolInput): Promise<RiskEngineToolOutput> {
    return this.riskEngineService.getRiskAnalysis(input.portfolioId, input.userId);
  }
}