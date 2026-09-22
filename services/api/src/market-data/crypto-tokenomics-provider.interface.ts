// crypto-tokenomics-provider.interface.ts

export interface TokenomicsData {
  marketCap: number | null;
  fullyDilutedValuation: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  circulatingToMaxRatio: number | null;
  marketCapToFdvRatio: number | null;
}

export interface CryptoTokenomicsProvider {
  getTokenomics(symbol: string): Promise<TokenomicsData | null>;
}