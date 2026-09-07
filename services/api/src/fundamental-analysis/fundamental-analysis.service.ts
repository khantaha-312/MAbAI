import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';

export interface FundamentalResult {
  available: boolean;
  reason?: string;
  peRatio: number | null;
  eps: number | null;
  marketCapitalization: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
  assessment: 'positive' | 'neutral' | 'negative' | 'insufficient_data';
  metricsAvailable: number;
  source: string | null;
}

@Injectable()
export class FundamentalAnalysisService {
  constructor(private readonly marketData: MarketDataService) {}

  async getFundamentals(symbol: string): Promise<FundamentalResult> {
    const fundamentals = await this.marketData.getEquityFundamentals(symbol);

    if (!fundamentals) {
      return {
        available: false,
        reason: `No fundamental data available for ${symbol} from Finnhub`,
        peRatio: null,
        eps: null,
        marketCapitalization: null,
        profitMargin: null,
        revenueGrowth: null,
        assessment: 'insufficient_data',
        metricsAvailable: 0,
        source: null,
      };
    }

    const { peRatio, eps, marketCapitalization, profitMargin, revenueGrowth } = fundamentals;
    const metrics = [peRatio, eps, marketCapitalization, profitMargin, revenueGrowth];
    const metricsAvailable = metrics.filter((m) => m !== null).length;

    let assessment: FundamentalResult['assessment'];
    if (metricsAvailable < 2) {
      assessment = 'insufficient_data';
    } else {
      let positiveSignals = 0;
      let totalSignals = 0;
      if (profitMargin !== null) {
        totalSignals++;
        if (profitMargin > 10) positiveSignals++;
      }
      if (revenueGrowth !== null) {
        totalSignals++;
        if (revenueGrowth > 0) positiveSignals++;
      }
      if (eps !== null) {
        totalSignals++;
        if (eps > 0) positiveSignals++;
      }

      if (totalSignals === 0) {
        assessment = 'insufficient_data';
      } else {
        const ratio = positiveSignals / totalSignals;
        if (ratio >= 0.7) assessment = 'positive';
        else if (ratio <= 0.3) assessment = 'negative';
        else assessment = 'neutral';
      }
    }

    return {
      available: true,
      peRatio,
      eps,
      marketCapitalization,
      profitMargin,
      revenueGrowth,
      assessment,
      metricsAvailable,
      source: 'Finnhub (Basic Financials)',
    };
  }
}