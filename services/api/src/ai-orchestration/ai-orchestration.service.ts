import { HttpStatus, Injectable } from '@nestjs/common';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PredictionLedgerService } from '../prediction-ledger/prediction-ledger.service';
import { ModelProviderService } from './model-provider.service';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';

@Injectable()
export class AiOrchestrationService {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly ledgerService: PredictionLedgerService,
    private readonly modelProvider: ModelProviderService,
  ) {}

  /**
   * Generates a plain-language risk narrative for a portfolio and logs
   * the interaction to the Prediction Ledger. Per frozen product rules,
   * this logging is NOT optional — every AI output goes through here,
   * there is no code path that generates AI output without it.
   */
  async generateNarrativeForPortfolio(portfolioId: string, userId: string) {
    const summary = await this.portfolioService.getSummary(portfolioId, userId);

    const promptInput = {
      portfolioName: summary.name,
      positions: summary.positions.map((p: any) => ({
        symbol: p.instrument.symbol,
        assetType: p.instrument.assetType,
        quantity: p.quantity,
        avgCostBasis: p.avgCostBasis,
        currentPriceUsd: p.currentPriceUsd,
      })),
    };

    const userPrompt = `Describe the current risk profile of this portfolio in 2-3 short paragraphs, plain language, no jargon:\n\n${JSON.stringify(promptInput, null, 2)}`;

    const result = await this.modelProvider.generateRiskNarrative(userPrompt);

    if (!result) {
      throw new AppException(
        ErrorCode.AI_GENERATION_FAILED,
        'Failed to generate AI narrative',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Mandatory ledger logging — this is the data moat, not optional telemetry.
    const ledgerEntry = await this.ledgerService.create(userId, {
      inputSnapshot: promptInput,
      generatedOutput: { narrative: result.text },
      modelProvider: result.modelProvider,
      modelName: result.modelName,
    });

    return {
      narrative: result.text,
      ledgerEntryId: ledgerEntry.id,
    };
  }
}