import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard'; // CONFIRM this matches the exact path used in profile.controller.ts
import { CurrentUser } from '../auth/current-user.decorator'; // CONFIRM this matches the exact path/name used in profile.controller.ts
import { WatchlistService } from './watchlist.service';
import { AddWatchlistItemDto } from './dto/add-watchlist-item.dto';
import { ReorderWatchlistDto } from './dto/reorder-watchlist.dto';

interface AuthenticatedUser {
  clerkId: string;
}

@UseGuards(ClerkAuthGuard)
@Controller('markets')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.watchlistService.list(user.clerkId);
  }

  @Post()
  add(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddWatchlistItemDto) {
    return this.watchlistService.add(user.clerkId, dto);
  }

  @Delete(':symbol')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('symbol') symbol: string,
    @Query('assetType') assetType: string,
  ) {
    if (!assetType) {
      throw new BadRequestException('assetType query param is required');
    }
    return this.watchlistService.remove(user.clerkId, symbol, assetType);
  }

  @Put('reorder')
  reorder(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReorderWatchlistDto) {
    return this.watchlistService.reorder(user.clerkId, dto);
  }
}