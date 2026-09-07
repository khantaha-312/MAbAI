import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception'; // CONFIRM path matches other engines
import { ErrorCode } from '../shared/errors/error-code'; // CONFIRM path

export interface RiskReplayResult {
  ledgerEntryId: string;
  createdAt: string;
  whatWasKnown: unknown; // raw inputSnapshot — the evidence available at the time
  whatWasSaid: unknown; // raw generatedOutput — the AI's actual output
  modelProvider: string;
  modelName: string;
  resolution: {
    status: string;
    resolved: boolean;
    resolvedAt: string | null;
    outcome: unknown | null;
    actualData: unknown | null;
  };
}

@Injectable()
export class RiskReplayService {
  constructor(private readonly prisma: PrismaService) {}

  async getReplay(ledgerEntryId: string, userId: string): Promise<RiskReplayResult> {
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { id: ledgerEntryId },
    });

    if (!entry || entry.userId !== userId) {
      // Same message for "not found" and "not yours" — don't leak
      // whether a ledger entry ID exists for someone else's account.
      throw new AppException(ErrorCode.LEDGER_ENTRY_NOT_FOUND, 'Ledger entry not found', HttpStatus.NOT_FOUND);
    }

    return {
      ledgerEntryId: entry.id,
      createdAt: entry.createdAt.toISOString(),
      whatWasKnown: entry.inputSnapshot,
      whatWasSaid: entry.generatedOutput,
      modelProvider: entry.modelProvider,
      modelName: entry.modelName,
      resolution: {
        status: entry.status,
        resolved: entry.resolvedAt !== null,
        resolvedAt: entry.resolvedAt?.toISOString() ?? null,
        outcome: entry.outcome ?? null,
        actualData: entry.actualData ?? null,
      },
    };
  }
}