// src/ai-tools/prediction-ledger.tool.ts
import { Injectable } from '@nestjs/common';
import { AiTool } from './ai-tool.interface';
import { PredictionLedgerService } from '../prediction-ledger/prediction-ledger.service';
import type { LedgerEntry } from '@prisma/client';

export interface PredictionLedgerToolInput {
  userId: string;
}

/**
 * Thin AiTool wrapper around PredictionLedgerService.findAllForUser — the
 * only real read method on this service (findOwnedOrThrow is private by
 * design, resolve() is a write). Zero new logic.
 */
@Injectable()
export class PredictionLedgerTool implements AiTool<PredictionLedgerToolInput, LedgerEntry[]> {
  readonly name = 'prediction_ledger';
  readonly description =
    "Retrieves all Prediction Ledger entries for a user, most recent first.";

  constructor(private readonly ledgerService: PredictionLedgerService) {}

  async execute(input: PredictionLedgerToolInput): Promise<LedgerEntry[]> {
    return this.ledgerService.findAllForUser(input.userId);
  }
}