import { IsArray, ArrayNotEmpty, IsString } from 'class-validator';

export class ReorderWatchlistDto {
  // Ordered array of WatchlistItem ids, in the desired display order
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedItemIds: string[];
}