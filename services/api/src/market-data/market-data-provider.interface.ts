export interface PriceBarData {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketDataProvider {
  getPriceUsd(identifier: string): Promise<number | null>;
  getHistoricalPricesUsd?(identifier: string, days: number): Promise<PriceBarData[] | null>;
}

export const COINGECKO_PROVIDER = 'COINGECKO_PROVIDER';
export const FINNHUB_PROVIDER = 'FINNHUB_PROVIDER';
export const ALPHA_VANTAGE_PROVIDER = 'ALPHA_VANTAGE_PROVIDER';
export const EIA_PROVIDER = 'EIA_PROVIDER';
export const GOLD_API_PROVIDER = 'GOLD_API_PROVIDER';
export const FRANKFURTER_PROVIDER = 'FRANKFURTER_PROVIDER';