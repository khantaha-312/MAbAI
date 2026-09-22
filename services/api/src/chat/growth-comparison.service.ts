import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ModelProviderService } from '../ai-orchestration/model-provider.service';

export interface GrowthComparisonResult {
  userId: string;
  fromDate: Date;
  toDate: Date;
  beliefsAtStart: Array<{ topic: string; belief: string; stateType: string }>;
  beliefsAtEnd: Array<{ topic: string; belief: string; stateType: string }>;
  growthEvents: Array<{
    topic: string;
    eventType: string;
    description: string;
    occurredAt: Date;
    fromBelief: string | null;
    toBelief: string | null;
  }>;
  ledgerOutcomeCounts: Record<string, number>;
  /** Present only when narrative generation was requested (default). */
  narrative?: string;
}

const NARRATIVE_UNAVAILABLE_FALLBACK =
  'Narrative summary unavailable right now (model provider did not respond). The structured data above is unaffected.';

// Field projections — only what the response view actually uses. Avoids
// pulling evidenceRefs, fingerprint, ids, and timestamps that are never
// read here, on a user-facing read path.
const BELIEF_SELECT = {
  topic: true,
  belief: true,
  stateType: true,
} satisfies Prisma.UserKnowledgeStateSelect;

const GROWTH_EVENT_SELECT = {
  topic: true,
  eventType: true,
  description: true,
  occurredAt: true,
  fromState: { select: { belief: true } },
  toState: { select: { belief: true } },
} satisfies Prisma.GrowthEventSelect;

@Injectable()
export class GrowthComparisonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelProvider: ModelProviderService,
  ) {}

  /**
   * @param includeNarrative defaults to true. Callers that only need the
   * structured data (e.g. a dashboard doing its own rendering) should
   * pass false to skip the LLM call entirely — it's the only
   * non-deterministic, latency-heavy step on this otherwise-fast
   * read path.
   */
  async compare(
    userId: string,
    fromDate: Date,
    toDate: Date,
    includeNarrative = true,
  ): Promise<GrowthComparisonResult> {
    const [beliefsAtStart, beliefsAtEnd, growthEvents, ledgerRows] =
      await Promise.all([
        this.prisma.userKnowledgeState.findMany({
          where: {
            userId,
            validFrom: { lte: fromDate },
            OR: [{ validTo: null }, { validTo: { gt: fromDate } }],
          },
          select: BELIEF_SELECT,
        }),
        this.prisma.userKnowledgeState.findMany({
          where: {
            userId,
            validFrom: { lte: toDate },
            OR: [{ validTo: null }, { validTo: { gt: toDate } }],
          },
          select: BELIEF_SELECT,
        }),
        this.prisma.growthEvent.findMany({
          where: { userId, occurredAt: { gte: fromDate, lte: toDate } },
          select: GROWTH_EVENT_SELECT,
          orderBy: { occurredAt: 'asc' },
        }),
        this.prisma.ledgerEntry.groupBy({
          by: ['outcome'],
          where: { userId, resolvedAt: { gte: fromDate, lte: toDate } },
          _count: { outcome: true },
        }),
      ]);

    const ledgerOutcomeCounts: Record<string, number> = {};
    for (const row of ledgerRows) {
      ledgerOutcomeCounts[row.outcome ?? 'unresolved'] = row._count.outcome;
    }

    const growthEventsView = growthEvents.map((e) => ({
      topic: e.topic,
      eventType: e.eventType,
      description: e.description,
      occurredAt: e.occurredAt,
      fromBelief: e.fromState?.belief ?? null,
      toBelief: e.toState?.belief ?? null,
    }));

    const result: GrowthComparisonResult = {
      userId,
      fromDate,
      toDate,
      beliefsAtStart,
      beliefsAtEnd,
      growthEvents: growthEventsView,
      ledgerOutcomeCounts,
    };

    // Narrative generation is the only non-deterministic, LLM-dependent
    // step here — skip it entirely rather than call and discard when the
    // caller doesn't need it.
    if (includeNarrative) {
      result.narrative = await this.generateNarrative({
        beliefsAtStart,
        beliefsAtEnd,
        growthEvents: growthEventsView,
        ledgerOutcomeCounts,
      });
    }

    return result;
  }

  private async generateNarrative(data: {
    beliefsAtStart: Array<{ topic: string; belief: string; stateType: string }>;
    beliefsAtEnd: Array<{ topic: string; belief: string; stateType: string }>;
    growthEvents: Array<{
      topic: string;
      eventType: string;
      description: string;
      fromBelief: string | null;
      toBelief: string | null;
    }>;
    ledgerOutcomeCounts: Record<string, number>;
  }): Promise<string> {
    const prompt = `
You are summarizing a user's analytical growth over a period, based ONLY
on the structured data below. Do NOT invent scores, percentages, ratings,
or any metric that is not explicitly present in this data. If the data is
sparse, say so plainly rather than filling gaps. Write 2-4 sentences.

Beliefs at start of period:
${JSON.stringify(data.beliefsAtStart, null, 2)}

Beliefs at end of period:
${JSON.stringify(data.beliefsAtEnd, null, 2)}

Growth events in period (with linked belief lineage where available):
${JSON.stringify(data.growthEvents, null, 2)}

Ledger outcome counts in period:
${JSON.stringify(data.ledgerOutcomeCounts, null, 2)}
`.trim();

    const result = await this.modelProvider.generateRiskNarrative(prompt);
    return result?.text ?? NARRATIVE_UNAVAILABLE_FALLBACK;
  }
}