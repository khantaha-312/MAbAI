import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PredictionLedgerService } from './prediction-ledger.service';
import type { User } from '@prisma/client';

@Controller('ledger-entries')
@UseGuards(ClerkAuthGuard)
export class PredictionLedgerController {
  constructor(private readonly ledgerService: PredictionLedgerService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    const entries = await this.ledgerService.findAllForUser(user.id);
    return { data: entries };
  }

  // Registered before no :id conflict exists (no GET /ledger-entries/:id
  // route currently defined), but kept as a distinct static segment
  // regardless so it can never be shadowed if one is added later.
  @Get('win-rate')
  async getWinRate(@CurrentUser() user: User) {
    const result = await this.ledgerService.getWinRate(user.id);
    return { data: result };
  }
}
