import { Injectable } from '@nestjs/common';
import { AiTool } from './ai-tool.interface';
import { EvidencePackageService } from '../evidence-package/evidence-package.service';
import { EvidencePackage } from '../evidence-package/evidence-package.types';

export interface MarketDataToolInput {
  symbol: string;
  assetType: string;
}

/**
 * Thin AiTool wrapper around EvidencePackageService.buildEvidencePackage.
 * Named "MarketDataTool" per the tool-contract design (not
 * "EvidencePackageTool") since from the AI orchestration layer's
 * perspective this IS the market-data-gathering tool — the fact that it's
 * currently backed by EvidencePackageService.buildEvidencePackage
 * (market + technical sections, honest unavailable placeholders for the
 * rest) is an implementation detail. Zero new logic — delegates and
 * returns the result unmodified.
 */
@Injectable()
export class MarketDataTool implements AiTool<MarketDataToolInput, EvidencePackage> {
  readonly name = 'market_data';
  readonly description =
    'Retrieves a structured Evidence Package (current price, technical analysis, and honest availability flags for not-yet-implemented sections) for a given symbol and asset type.';

  constructor(private readonly evidencePackageService: EvidencePackageService) {}

  async execute(input: MarketDataToolInput): Promise<EvidencePackage> {
    return this.evidencePackageService.buildEvidencePackage(input.symbol, input.assetType);
  }
}