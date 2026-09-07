import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerEntry } from '@prisma/client';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { ResolveLedgerEntryDto } from './dto/resolve-ledger-entry.dto';
import { AppException } from '../shared/exceptions/app.exception';
import { ErrorCode } from '../shared/errors/error-code';
import { HttpStatus } from '@nestjs/common';

export type WinRateOutcome = 'correct' | 'incorrect' | 'partial';

export interface WinRateResult {
  status: 'ok' | 'insufficient_data';
  // Total LedgerEntry rows for this user, regardless of status — the
  // headline "total predictions made" number, distinct from resolvedCount
  // (how many have actually been graded so far).
  totalPredictions: number;
  pendingCount: number;
  resolvedCount: number;
  minimumRequired: number;
  counts?: { correct: number; incorrect: number; partial: number };
  // percentage is correct / (correct + incorrect). 'partial' outcomes are
  // reported in `counts` but excluded from the percentage, same reasoning
  // as the trend engine excluding neutral RSI readings from evidenceCount:
  // a value that didn't clearly go one way or the other shouldn't silently
  // dilute a "win rate" number that implies a clean correct/incorrect split.
  winRatePct?: number;
}

const MIN_RESOLVED_SAMPLE_SIZE = 10;

@Injectable()
export class PredictionLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  // --- confirmed existing methods, UNCHANGED ---

  async create(userId: string, dto: CreateLedgerEntryDto): Promise<LedgerEntry> {
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

  private async findOwnedOrThrow(id: string, userId: string): Promise<LedgerEntry> {
    const entry = await this.prisma.ledgerEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) {
      throw new AppException(ErrorCode.LEDGER_ENTRY_NOT_FOUND, 'Ledger entry not found', HttpStatus.NOT_FOUND);
    }
    return entry;
  }

  // The ONLY method permitted to write to a LedgerEntry after creation.
  // Enforces single-resolution (throws if status !== 'pending').
  async resolve(id: string, userId: string, dto: ResolveLedgerEntryDto): Promise<LedgerEntry> {
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
      data: { status: 'resolved', outcome: dto.outcome, actualData: dto.actualData as object, resolvedAt: new Date() },
    });
  }

  // --- new methods added for the win-rate feature ---

  /**
   * Pending entries old enough to be candidates for automatic resolution.
   * Read-only — does not itself write anything, so it carries none of the
   * single-resolve risk; the actual write still only ever happens through
   * `resolve()` above.
   *
   * Scoped platform-wide (no userId filter) because the resolution job is
   * a system process, not a per-user request — it needs to see every
   * user's pending entries to resolve them all on schedule.
   */
  async findPendingOlderThan(cutoff: Date): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: { status: 'pending', createdAt: { lt: cutoff } },
    });
  }

  /**
   * Per-user win-rate aggregation. Deliberately scoped to a single user
   * (see task decision: platform-wide would cross the same ownership
   * boundary `findOwnedOrThrow` already enforces elsewhere on this
   * service). Returns an explicit `insufficient_data` state below
   * MIN_RESOLVED_SAMPLE_SIZE resolved entries rather than a real but
   * misleadingly precise percentage off a tiny sample — same pattern as
   * severity.level in risk-engine.service.ts and assessment in the
   * fundamental-analysis endpoint.
   */
  async getWinRate(userId: string): Promise<WinRateResult> {
    const [resolved, totalPredictions, pendingCount] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { userId, status: 'resolved' },
        select: { outcome: true },
      }),
      this.prisma.ledgerEntry.count({ where: { userId } }),
      this.prisma.ledgerEntry.count({ where: { userId, status: 'pending' } }),
    ]);

    const resolvedCount = resolved.length;

    if (resolvedCount < MIN_RESOLVED_SAMPLE_SIZE) {
      return {
        status: 'insufficient_data',
        totalPredictions,
        pendingCount,
        resolvedCount,
        minimumRequired: MIN_RESOLVED_SAMPLE_SIZE,
      };
    }

    const counts = { correct: 0, incorrect: 0, partial: 0 };
    for (const { outcome } of resolved) {
      if (outcome === 'correct' || outcome === 'incorrect' || outcome === 'partial') {
        counts[outcome]++;
      }
    }

    const decisive = counts.correct + counts.incorrect;
    const winRatePct = decisive > 0 ? (counts.correct / decisive) * 100 : 0;

    return {
      status: 'ok',
      totalPredictions,
      pendingCount,
      resolvedCount,
      minimumRequired: MIN_RESOLVED_SAMPLE_SIZE,
      counts,
      winRatePct: Math.round(winRatePct * 100) / 100,
    };
  }
}