import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataProvider, PriceBarData } from './market-data-provider.interface';

interface EiaDataPoint {
  period: string;
  value: number;
}

interface EiaResponse {
  response?: { data: EiaDataPoint[] };
}

// Only WTI and Brent are supported by this adapter today — the two series flagged in the brief.
const EIA_SERIES_MAP: Record<string, string> = {
  WTI: 'PET.RWTC.D',
  BRENT: 'PET.RBRTE.D',
};

@Injectable()
export class EiaAdapter implements MarketDataProvider {
  private readonly logger = new Logger(EiaAdapter.name);
  private readonly baseUrl = 'https://api.eia.gov/v2/petroleum/pri/spt/data';

  private async fetchSeries(identifier: string, limit: number): Promise<EiaDataPoint[] | null> {
    const apiKey = process.env.EIA_API_KEY;
    if (!apiKey) {
      this.logger.error('EIA_API_KEY is not set');
      return null;
    }
    const seriesId = EIA_SERIES_MAP[identifier.toUpperCase()];
    if (!seriesId) {
      this.logger.warn(`EiaAdapter does not support identifier: ${identifier}`);
      return null;
    }
    const url = `${this.baseUrl}?api_key=${apiKey}&frequency=daily&data[0]=value&facets[series][]=${seriesId.split('.')[1]}&sort[0][column]=period&sort[0][direction]=desc&length=${limit}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`EIA returned ${response.status} for ${identifier}`);
        return null;
      }
      const data = (await response.json()) as EiaResponse;
      return data.response?.data ?? null;
    } catch (error) {
      this.logger.error(`Failed to fetch EIA data for ${identifier}`, error);
      return null;
    }
  }

  async getPriceUsd(identifier: string): Promise<number | null> {
    const points = await this.fetchSeries(identifier, 1);
    return points?.[0]?.value ?? null;
  }

  async getHistoricalPricesUsd(identifier: string, days: number): Promise<PriceBarData[] | null> {
    const points = await this.fetchSeries(identifier, days);
    if (!points) return null;
    // EIA spot price series report a single daily value, not full OHLC — open/high/low/close all equal close here.
    // This is a real, honest limitation, not a bug: flag it if the UI ever needs true intraday range for oil.
    return points.map((p) => ({
      date: p.period,
      open: p.value,
      high: p.value,
      low: p.value,
      close: p.value,
    }));
  }
}