import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BehavioralAnalysisResult {
  available: boolean;
  reason?: string;
  repeatedRiskExposure: {
    instrumentSymbol: string;
    flagCount: number;
    flagTypes: string[];
  }[];
  concentrationPatternVsProfile: {
    available: boolean;
    reason?: string;
    tradingStyle: string[];
    concentrationFlagCount: number;
    observation: string | null;
  };
  ledgerEngagement: {
    totalAnalysesRequested: number;
    firstRequestAt: string | null;
    lastRequestAt: string | null;
  };
}

@Injectable()
export class BehavioralAnalysisService {
  private readonly logger = new Logger(BehavioralAnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBehavioralAnalysis(userId: string): Promise<BehavioralAnalysisResult> {
    const [profile, riskFlags, ledgerEntries] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.riskFlag.findMany({
        where: { position: { portfolio: { userId } } },
        include: { instrument: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.ledgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    if (riskFlags.length === 0 && ledgerEntries.length === 0) {
      return {
        available: false,
        reason: 'No risk flag or ledger history yet — behavioral patterns require observed activity over time',
        repeatedRiskExposure: [],
        concentrationPatternVsProfile: {
          available: false,
          reason: 'No data available',
          tradingStyle: profile?.tradingStyle ?? [],
          concentrationFlagCount: 0,
          observation: null,
        },
        ledgerEngagement: { totalAnalysesRequested: 0, firstRequestAt: null, lastRequestAt: null },
      };
    }

    // --- Repeated risk exposure: real counts, no interpretation beyond counting ---
    const byInstrument = new Map<string, { flagTypes: string[]; count: number }>();
    for (const flag of riskFlags) {
      const key = flag.instrument.symbol;
      const existing = byInstrument.get(key) ?? { flagTypes: [], count: 0 };
      existing.count++;
      if (!existing.flagTypes.includes(flag.flagType)) existing.flagTypes.push(flag.flagType);
      byInstrument.set(key, existing);
    }
    const repeatedRiskExposure = Array.from(byInstrument.entries())
      .filter(([, v]) => v.count >= 2) // "repeated" requires at least 2 real occurrences
      .map(([instrumentSymbol, v]) => ({
        instrumentSymbol,
        flagCount: v.count,
        flagTypes: v.flagTypes,
      }));

    // --- Concentration pattern vs. stated profile — observable mismatch only, no motive inferred ---
    const concentrationFlagCount = riskFlags.filter((f) => f.flagType === 'CONCENTRATION_RISK').length;
    const styles = profile?.tradingStyle ?? [];
    let concentrationObservation: string | null = null;
    let concentrationAvailable = false;

    if (styles.length > 0 && concentrationFlagCount > 0) {
      concentrationAvailable = true;
      // .some() rather than checking a single value — a multi-style trader
      // (e.g. SCALPING + LONG_TERM_INVESTMENT) should still trigger the
      // long-horizon observation if any selected style is long-horizon.
      const isLongHorizon = styles.some(
        (s) => s === 'SHORT_TERM_INVESTMENT' || s === 'LONG_TERM_INVESTMENT',
      );
      // Pre-existing bug fixed in the same pass: .replace('_', ' ') only
      // replaced the first underscore, so SHORT_TERM_INVESTMENT rendered
      // as "short term_investment". Global flag fixes this.
      const styleLabel = styles.map((s) => s.toLowerCase().replace(/_/g, ' ')).join(' / ');
      concentrationObservation = isLongHorizon
        ? `${concentrationFlagCount} concentration risk flag(s) recorded despite a stated ${styleLabel} trading style — worth reviewing position sizing relative to stated goals.`
        : `${concentrationFlagCount} concentration risk flag(s) recorded, consistent with a ${styleLabel} style where larger concentrated positions may be intentional.`;
    }

    return {
      available: true,
      repeatedRiskExposure,
      concentrationPatternVsProfile: {
        available: concentrationAvailable,
        reason: concentrationAvailable ? undefined : 'No concentration flags recorded yet, or no trading style set',
        tradingStyle: styles,
        concentrationFlagCount,
        observation: concentrationObservation,
      },
      ledgerEngagement: {
        totalAnalysesRequested: ledgerEntries.length,
        firstRequestAt: ledgerEntries[0]?.createdAt?.toISOString() ?? null,
        lastRequestAt: ledgerEntries[ledgerEntries.length - 1]?.createdAt?.toISOString() ?? null,
      },
    };
  }
}