import { IsIn, IsString } from 'class-validator';

// CONFIRMED from real MarketDataController: these are the 5 real values
// the price-dispatch logic understands. This is a DIFFERENT enum from
// UserProfile.assetClasses (STOCKS/FOREX/COMMODITIES/CRYPTO) — don't merge them.
export const KNOWN_ASSET_TYPES = ['crypto', 'equity', 'forex', 'metal', 'oil'] as const;

export class AddWatchlistItemDto {
  @IsString()
  symbol: string;

  @IsIn(KNOWN_ASSET_TYPES)
  assetType: string;
}