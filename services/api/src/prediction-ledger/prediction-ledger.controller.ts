import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PredictionLedgerService } from './prediction-ledger.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { ResolveLedgerEntryDto } from './dto/resolve-ledger-entry.dto';
import type { User } from '@prisma/client';

@Controller('ledger-entries')
@UseGuards(ClerkAuthGuard)
export class PredictionLedgerController {
  constructor(private readonly ledgerService: PredictionLedgerService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateLedgerEntryDto) {
    const entry = await this.ledgerService.create(user.id, dto);
    return { data: entry };
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    const entries = await this.ledgerService.findAllForUser(user.id);
    return { data: entries };
  }

  @Post(':id/resolve')
  async resolve(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ResolveLedgerEntryDto,
  ) {
    const entry = await this.ledgerService.resolve(id, user.id, dto);
    return { data: entry };
  }
}