import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { LedgerEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PredictionLedgerService } from '../prediction-ledger/prediction-ledger.service';
import { ModelProviderService } from './model-provider.service';
import { EvidencePackageService } from '../evidence-package/evidence-package.service';
import { MacroAnalysisService } from '../macro-analysis/macro-analysis.service';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';

@Injectable()
export class AiOrchestrationService {
  private readonly logger = new Logger(AiOrchestrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioService: PortfolioService,
    private readonly ledgerService: PredictionLedgerService,
    private readonly modelProvider: ModelProviderService,
    private readonly evidencePackageService: EvidencePackageService,
    private readonly macroAnalysisService: MacroAnalysisService,
  ) {}

  private async buildPersonaContext(userId: string): Promise<string | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    const parts: string[] = [];

    if (profile.expertiseTier) {
      parts.push(`a ${profile.expertiseTier} trader`);
    } else {
      parts.push('a trader');
    }

    parts.push(`with a ${profile.tradingStyle} style`);

    if (profile.riskAppetite) {
      parts.push(`and a ${profile.riskAppetite} risk appetite`);
    }

    return (
      `This user is ${parts.join(' ')} — tailor your explanation depth and framing accordingly, ` +
      `but do not change the underlying evidence or invent additional risk/opportunity to match ` +
      `their profile — personalization must only affect explanation style, never the facts presented.`
    );
  }

  private async findRelatedLedgerEntriesForSimilarPersonas(
    userId: string,
    limit = 5,
  ): Promise<LedgerEntry[]> {
    try {
      const selfEmbeddingCheck = await this.prisma.$queryRaw<{ dims: number | null }[]>(
        Prisma.sql`SELECT vector_dims("personaEmbedding") as dims FROM "UserProfile" WHERE "userId" = ${userId}`,
      );

      const dims = selfEmbeddingCheck[0]?.dims ?? null;
      if (dims === null) {
        this.logger.debug(
          `Persona embedding unavailable for user ${userId}. Skipping similar persona lookup.`,
        );
        return [];
      }

      const relatedEntries = await this.prisma.$queryRaw<LedgerEntry[]>(
        Prisma.sql`
          SELECT le.*
          FROM "LedgerEntry" le
          JOIN "UserProfile" up ON up."userId" = le."userId"
          WHERE up."userId" != ${userId}
            AND up."personaEmbedding" IS NOT NULL
          ORDER BY up."personaEmbedding" <=> (
            SELECT "personaEmbedding" FROM "UserProfile" WHERE "userId" = ${userId}
          )
          LIMIT ${limit}
        `,
      );

      return relatedEntries;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve related ledger entries for similar personas: ${error}`,
      );
      return [];
    }
  }

  async generateNarrativeForPortfolio(portfolioId: string, userId: string) {
    const summary = await this.portfolioService.getSummary(portfolioId, userId);

    const macroSnapshot = await this.macroAnalysisService.getMacroSnapshot();

    const personaContext = await this.buildPersonaContext(userId);

    const relatedEntries = await this.findRelatedLedgerEntriesForSimilarPersonas(userId);

    const positionsWithEvidence = await Promise.all(
      summary.positions.map(async (p: any) => {
        const evidence = await this.evidencePackageService.buildEvidencePackage(
          p.instrument.symbol,
          p.instrument.assetType,
        );

        return {
          symbol: p.instrument.symbol,
          assetType: p.instrument.assetType,
          quantity: p.quantity,
          avgCostBasis: p.avgCostBasis,
          currentPriceUsd: p.currentPriceUsd,
          technical: evidence.technical,
          fundamental: evidence.fundamental,
        };
      }),
    );

    const promptInput = {
      portfolioName: summary.name,
      positions: positionsWithEvidence,
      macroContext: {
        oil: macroSnapshot.oil,
        gold: macroSnapshot.gold,
        usdStrength: macroSnapshot.usdStrength,
      },
      similarPersonaHistoryCount: relatedEntries.length,
    };

    const personaBlock = personaContext ? `\n\n${personaContext}\n` : '';

    const userPrompt = `Describe the current risk profile of this portfolio in 2-3 short paragraphs, plain language, no jargon. Use the technical analysis, fundamental analysis, and macro context provided for each holding to ground your assessment in real evidence rather than speculation.${personaBlock}\n\n${JSON.stringify(promptInput, null, 2)}`;

    const result = await this.modelProvider.generateRiskNarrative(userPrompt);

    if (!result) {
      throw new AppException(
        ErrorCode.AI_GENERATION_FAILED,
        'Failed to generate AI narrative',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const ledgerEntry = await this.ledgerService.create(userId, {
      inputSnapshot: {
        ...promptInput,
        personaContext,
        relatedPersonaEntriesCount: relatedEntries.length,
      },
      generatedOutput: { narrative: result.text },
      modelProvider: result.modelProvider,
      modelName: result.modelName,
    });

    return {
      narrative: result.text,
      ledgerEntryId: ledgerEntry.id,
      modelProvider: result.modelProvider,
    };
  }

  /**
   * Generates a narrative for a SINGLE symbol, not a whole portfolio.
   * Reuses the same real pieces as generateNarrativeForPortfolio:
   * EvidencePackageService for grounded evidence, buildPersonaContext for
   * real personalization (pulled from UserProfile — already built, not
   * new work).
   *
   * FUTURE HOOK, not built yet: once the memory/growth feature exists
   * (UserKnowledgeState, GrowthComparisonService), this is the method
   * where that context should be fetched and appended alongside
   * personaContext — same pattern, new input, no restructuring needed.
   * Left as a clearly marked no-op for now per explicit decision to defer
   * that feature.
   *
   * Does NOT write to the Prediction Ledger — single-symbol narratives
   * aren't tracked for win-rate purposes today. Revisit if that's wanted.
   */
  async generateSymbolNarrative(symbol: string, assetType: string, userId: string) {
    const evidence = await this.evidencePackageService.buildEvidencePackage(symbol, assetType);
    const personaContext = await this.buildPersonaContext(userId);

    // TODO (future, not now): fetch real growth/memory context here once
    // that feature exists, e.g.:
    //   const growthContext = await this.growthComparisonService.getRecentSummary(userId);
    // and append it below, same way personaContext is appended.

    const personaBlock = personaContext ? `\n\n${personaContext}\n` : '';

    const promptInput = {
      symbol,
      assetType,
      market: evidence.market,
      technical: evidence.technical,
      fundamental: evidence.fundamental,
    };

    const userPrompt = `Explain the current technical and fundamental picture for ${symbol} in 2-3 short paragraphs, plain language, no jargon. Ground every claim in the evidence provided below — do not speculate beyond it.${personaBlock}\n\n${JSON.stringify(promptInput, null, 2)}`;

    const result = await this.modelProvider.generateRiskNarrative(userPrompt);

    if (!result) {
      throw new AppException(
        ErrorCode.AI_GENERATION_FAILED,
        'Failed to generate AI narrative',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      narrative: result.text,
      modelProvider: result.modelProvider,
    };
  }
}