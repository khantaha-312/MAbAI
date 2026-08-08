import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { ResolveLedgerEntryDto } from './dto/resolve-ledger-entry.dto';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';
import type { LedgerEntry } from '@prisma/client';

@Injectable()
export class PredictionLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new immutable ledger entry. Every AI output MUST be logged
   * via this method per the frozen product decision — this is not
   * optional supplementary logging, it IS the data moat.
   */
  async create(
    userId: string,
    dto: CreateLedgerEntryDto,
  ): Promise<LedgerEntry> {
    return this.prisma.ledgerEntry.create({
      data: {
        userId,
        inputSnapshot: dto.inputSnapshot as object,
        generatedOutput: dto.generatedOutput as object,
        modelProvider: dto.modelProvider,
        modelName: dto.modelName,
        status: 'pending',
      },
    });
  }

  async findAllForUser(userId: string): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOwnedOrThrow(
    id: string,
    userId: string,
  ): Promise<LedgerEntry> {
    const entry = await this.prisma.ledgerEntry.findUnique({ where: { id } });

    if (!entry || entry.userId !== userId) {
      throw new AppException(
        ErrorCode.LEDGER_ENTRY_NOT_FOUND,
        'Ledger entry not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return entry;
  }

  /**
   * The ONLY method permitted to write to a LedgerEntry after creation.
   * Writes status/outcome/actualData/resolvedAt — nothing else. Enforces
   * that an entry can only be resolved once, since resolving an already-
   * resolved prediction would corrupt the calibration-score data this
   * table exists to protect.
   */
  async resolve(
    id: string,
    userId: string,
    dto: ResolveLedgerEntryDto,
  ): Promise<LedgerEntry> {
    const entry = await this.findOwnedOrThrow(id, userId);

    if (entry.status !== 'pending') {
      throw new AppException(
        ErrorCode.LEDGER_ENTRY_ALREADY_RESOLVED,
        'This ledger entry has already been resolved',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.ledgerEntry.update({
      where: { id },
      data: {
        status: 'resolved',
        outcome: dto.outcome,
        actualData: dto.actualData as object,
        resolvedAt: new Date(),
      },
    });
  }
}