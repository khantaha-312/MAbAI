import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { KNOWN_ASSET_TYPES } from '../watchlist/dto/add-watchlist-item.dto';
import { InstrumentsService } from './instruments.service';

@UseGuards(ClerkAuthGuard)
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get('search')
  search(@Query('q') q: string, @Query('assetType') assetType?: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException('q query param is required');
    }

    if (assetType && !KNOWN_ASSET_TYPES.includes(assetType as any)) {
      throw new BadRequestException(
        `assetType must be one of: ${KNOWN_ASSET_TYPES.join(', ')}`,
      );
    }

    return this.instrumentsService.search(q.trim(), assetType);
  }
}