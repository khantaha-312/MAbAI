  /**
   * Evidence Package — the structured contract between analytical engines
   * and the AI Orchestrator (master brief §9). Every section is either
   * genuinely available (with real data + source) or explicitly marked
   * unavailable — never fabricated, never silently empty (§20).
   */

  export interface UnavailableSection {
    available: false;
    reason: string;
    source: null;
  }

  export interface AvailableSection<T> {
    available: true;
    data: T;
    source: string;
  }

  export type EvidenceSection<T> = AvailableSection<T> | UnavailableSection;

  export interface MarketEvidence {
    price: number;
    assetType: string;
  }

  export interface EvidencePackage {
    symbol: string;
    assetType: string;
    instrumentId: string | null;
    timestamp: string;

    market: EvidenceSection<MarketEvidence>;
    technical: EvidenceSection<unknown>; // shape = TechnicalAnalysisService.getAggregate() output
    fundamental: EvidenceSection<unknown>;
    macro: EvidenceSection<unknown>;
    news: EvidenceSection<unknown>;
    sentiment: EvidenceSection<unknown>;
    portfolio: EvidenceSection<unknown>;
    behavioral: EvidenceSection<unknown>;

    dataFreshness: { section: string; asOf: string | null }[];
    sources: string[];
  }

  export function unavailable(reason: string): UnavailableSection {
    return { available: false, reason, source: null };
  }