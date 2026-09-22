import { Test } from '@nestjs/testing';
import { KnowledgeConsolidationJob } from './knowledge-consolidation.job';
import { PrismaService } from '../prisma/prisma.service';
import { ModelProviderService } from '../ai-orchestration/model-provider.service';

/**
 * These tests exercise KnowledgeConsolidationJob entirely through its one
 * public method, run() — the same entry point the real @Cron tick and the
 * run-consolidation.ts script use. Nothing here reaches into private
 * methods, so a passing test here means the actual production code path
 * behaves correctly, not just an internal helper in isolation.
 *
 * Per the review's own instruction (Section 26): assertions check what
 * was actually WRITTEN (the exact arguments passed to Prisma calls), not
 * just "the job completed without throwing."
 */

const TEST_USER_ID = 'user_test_1';

function makeMessage(overrides: Partial<{
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'msg_1',
    userId: TEST_USER_ID,
    role: overrides.role ?? 'user',
    content: overrides.content ?? 'I only trade swing positions, never day trading.',
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
  };
}

function llmResponse(candidates: unknown[]) {
  return {
    text: JSON.stringify({ candidates }),
    modelProvider: 'anthropic',
    modelName: 'claude-sonnet-4-6',
  };
}

/** Builds a fresh job instance with fully controllable Prisma/LLM mocks
 * for each test — no shared state between tests. */
async function buildJob(overrides: {
  chatMessages?: ReturnType<typeof makeMessage>[];
  activeStates?: Array<{ topic: string; belief: string; stateType: string }>;
  existingByFingerprint?: unknown;
  currentActive?: unknown;
  closeCount?: number; // simulates updateMany's returned count when closing a state
  llmResult?: unknown; // what generateRiskNarrative resolves to
}) {
  const txMock = {
    userKnowledgeState: {
      updateMany: jest.fn().mockResolvedValue({ count: overrides.closeCount ?? 1 }),
      create: jest.fn().mockResolvedValue({ id: 'new_state_id' }),
    },
    growthEvent: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  };

  const prismaMock = {
    chatMessage: {
      findMany: jest.fn().mockResolvedValue(overrides.chatMessages ?? [makeMessage()]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    userKnowledgeState: {
      findMany: jest.fn().mockResolvedValue(overrides.activeStates ?? []),
      findUnique: jest.fn().mockResolvedValue(overrides.existingByFingerprint ?? null),
      findFirst: jest.fn().mockResolvedValue(overrides.currentActive ?? null),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(async (cb: (tx: typeof txMock) => Promise<void>) => cb(txMock)),
  };

  const modelProviderMock = {
    generateRiskNarrative: jest.fn().mockResolvedValue(
      overrides.llmResult !== undefined ? overrides.llmResult : llmResponse([]),
    ),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      KnowledgeConsolidationJob,
      { provide: PrismaService, useValue: prismaMock },
      { provide: ModelProviderService, useValue: modelProviderMock },
    ],
  }).compile();

  const job = moduleRef.get(KnowledgeConsolidationJob);
  return { job, prismaMock, txMock, modelProviderMock };
}

describe('KnowledgeConsolidationJob', () => {
  it('creates a new UserKnowledgeState for a genuinely new, DURABLE belief', async () => {
    const { job, txMock, prismaMock } = await buildJob({
      llmResult: llmResponse([
        {
          topic: 'Trading Strategy',
          belief: 'Only trades swing positions.',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'NEW',
          permanence: 'DURABLE',
          growthEvent: null,
        },
      ]),
    });

    await job.run();

    expect(txMock.userKnowledgeState.create).toHaveBeenCalledTimes(1);
    const created = txMock.userKnowledgeState.create.mock.calls[0][0].data;
    expect(created.topic).toBe('Trading Strategy');
    expect(created.sourceType).toBe('USER_STATED'); // grounded: belief text overlaps the real message
    expect(created.evidenceCount).toBe(1);
    expect(created.supersedesId).toBeNull();
    expect(created.evidenceRefs).toEqual({ sourceMessageIds: ['msg_1'] });
    expect(txMock.growthEvent.upsert).not.toHaveBeenCalled();
    // Message must still be marked consolidated even though the write
    // happened inside a transaction, not via this call directly.
    expect(prismaMock.chatMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consolidatedAt: expect.any(Date) } }),
    );
  });

  it('reinforces an exact-repeat belief via fingerprint match instead of duplicating it', async () => {
    const { job, prismaMock, txMock } = await buildJob({
      existingByFingerprint: { id: 'existing_1' },
      llmResult: llmResponse([
        {
          topic: 'Trading Strategy',
          belief: 'Only trades swing positions.',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'REAFFIRMED',
          permanence: 'DURABLE',
          growthEvent: null,
        },
      ]),
    });

    await job.run();

    expect(prismaMock.userKnowledgeState.update).toHaveBeenCalledWith({
      where: { id: 'existing_1' },
      data: {
        evidenceCount: { increment: 1 },
        lastObservedAt: expect.any(Date),
        evidenceRefs: { sourceMessageIds: ['msg_1'] },
      },
    });
    // Reinforcement never opens a transaction — it's a direct update.
    expect(txMock.userKnowledgeState.create).not.toHaveBeenCalled();
  });

  it('merges new message ids into existing evidenceRefs on reinforcement, deduping repeats', async () => {
    const { job, prismaMock } = await buildJob({
      chatMessages: [makeMessage({ id: 'msg_new' })],
      existingByFingerprint: {
        id: 'existing_1',
        evidenceRefs: { sourceMessageIds: ['msg_old', 'msg_new'] }, // msg_new deliberately already present
      },
      llmResult: llmResponse([
        {
          topic: 'Trading Strategy',
          belief: 'Only trades swing positions, never day trading.',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'REAFFIRMED',
          permanence: 'DURABLE',
          growthEvent: null,
        },
      ]),
    });

    await job.run();

    const updateCall = prismaMock.userKnowledgeState.update.mock.calls[0][0];
    // Old evidence preserved, new evidence added, no duplicate for the id
    // that was already present in both lists.
    expect(updateCall.data.evidenceRefs.sourceMessageIds.sort()).toEqual(['msg_new', 'msg_old']);
  });

  it('downgrades a claimed CHANGED to REAFFIRMED when the belief is only cosmetically reworded', async () => {
    const { job, prismaMock, txMock } = await buildJob({
      currentActive: { id: 'active_1', belief: 'Only trades swing positions.' },
      llmResult: llmResponse([
        {
          topic: 'Trading Strategy',
          // Same belief, different casing/whitespace only — the backend
          // safety net (not the LLM's own label) should catch this.
          belief: '  only   trades swing positions.  ',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'CHANGED', // LLM mislabels it
          permanence: 'DURABLE',
          growthEvent: null,
        },
      ]),
    });

    await job.run();

    // Should reinforce the existing active row, NOT close it and create a
    // new one — proves the backend doesn't trust changeType blindly.
    expect(prismaMock.userKnowledgeState.update).toHaveBeenCalledWith({
      where: { id: 'active_1' },
      data: {
        evidenceCount: { increment: 1 },
        lastObservedAt: expect.any(Date),
        evidenceRefs: { sourceMessageIds: ['msg_1'] },
      },
    });
    expect(txMock.userKnowledgeState.create).not.toHaveBeenCalled();
  });

  it('on a genuine CHANGED transition: closes the old state, creates a new one, and creates a GrowthEvent with backend-derived occurredAt', async () => {
    const oldMessageTime = new Date('2026-01-01T00:00:00.000Z');
    const newMessageTime = new Date('2026-02-01T00:00:00.000Z');
    const { job, txMock } = await buildJob({
      chatMessages: [makeMessage({ id: 'msg_change', createdAt: newMessageTime })],
      currentActive: { id: 'active_1', belief: 'Only trades swing positions.' },
      llmResult: llmResponse([
        {
          topic: 'Trading Strategy',
          belief: 'Only trades day positions now.',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'CHANGED',
          permanence: 'DURABLE',
          growthEvent: {
            eventType: 'STRATEGY_CHANGE',
            description: 'Switched from swing to day trading.',
            // LLM's own date is deliberately wrong/old — must be ignored.
            occurredAt: oldMessageTime.toISOString(),
            evidenceRefs: { sourceMessageIds: ['msg_change'] },
          },
        },
      ]),
    });

    await job.run();

    expect(txMock.userKnowledgeState.updateMany).toHaveBeenCalledWith({
      where: { id: 'active_1', validTo: null },
      data: { validTo: expect.any(Date) },
    });
    expect(txMock.userKnowledgeState.create).toHaveBeenCalledTimes(1);
    expect(txMock.userKnowledgeState.create.mock.calls[0][0].data.supersedesId).toBe('active_1');

    expect(txMock.growthEvent.upsert).toHaveBeenCalledTimes(1);
    const geCreate = txMock.growthEvent.upsert.mock.calls[0][0].create;
    // The critical assertion: occurredAt must come from the real message
    // timestamp, NOT the LLM's stated (wrong) date.
    expect(geCreate.occurredAt).toEqual(newMessageTime);
    expect(geCreate.occurredAt).not.toEqual(oldMessageTime);
    expect(geCreate.fromStateId).toBe('active_1');
  });

  it('never persists a candidate whose permanence is not DURABLE, even with valid changeType/evidence', async () => {
    const { job, txMock, prismaMock } = await buildJob({
      llmResult: llmResponse([
        {
          topic: 'Options Trading',
          belief: 'Might consider options trading if capital increases.',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'NEW',
          permanence: 'HYPOTHETICAL', // <-- the gate under test
          growthEvent: null,
        },
      ]),
    });

    await job.run();

    expect(txMock.userKnowledgeState.create).not.toHaveBeenCalled();
    expect(prismaMock.userKnowledgeState.update).not.toHaveBeenCalled();
    // Nothing persisted, but the message is still correctly marked
    // consolidated — there's nothing further this candidate can yield.
    expect(prismaMock.chatMessage.updateMany).toHaveBeenCalled();
  });

  it('discards a malformed candidate (invalid stateType) but still processes other valid candidates in the same batch', async () => {
    const { job, txMock } = await buildJob({
      llmResult: llmResponse([
        {
          topic: 'Bad Candidate',
          belief: 'This has an invalid stateType.',
          stateType: 'NOT_A_REAL_STATE_TYPE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'NEW',
          permanence: 'DURABLE',
          growthEvent: null,
        },
        {
          topic: 'Good Candidate',
          belief: 'Only trades swing positions.',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'NEW',
          permanence: 'DURABLE',
          growthEvent: null,
        },
      ]),
    });

    await job.run();

    // Partial acceptance: exactly one create, for the good candidate only.
    expect(txMock.userKnowledgeState.create).toHaveBeenCalledTimes(1);
    expect(txMock.userKnowledgeState.create.mock.calls[0][0].data.topic).toBe('Good Candidate');
  });

  it('discards a candidate whose growthEvent cites a message id that does not exist in the real batch', async () => {
    const { job, txMock } = await buildJob({
      chatMessages: [makeMessage({ id: 'real_msg_id' })],
      currentActive: { id: 'active_1', belief: 'Only trades swing positions.' },
      llmResult: llmResponse([
        {
          topic: 'Trading Strategy',
          belief: 'Only trades day positions now.',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'CHANGED',
          permanence: 'DURABLE',
          growthEvent: {
            eventType: 'STRATEGY_CHANGE',
            description: 'Switched from swing to day trading.',
            occurredAt: new Date().toISOString(),
            // This id was never in the batch — must be rejected.
            evidenceRefs: { sourceMessageIds: ['invented_id_not_in_batch'] },
          },
        },
      ]),
    });

    await job.run();

    expect(txMock.userKnowledgeState.create).not.toHaveBeenCalled();
    expect(txMock.growthEvent.upsert).not.toHaveBeenCalled();
  });

  it('rejects a growthEvent attached to a NEW or REAFFIRMED candidate (materiality gate)', async () => {
    const { job, txMock } = await buildJob({
      llmResult: llmResponse([
        {
          topic: 'Trading Strategy',
          belief: 'Only trades swing positions.',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'NEW', // not CHANGED
          permanence: 'DURABLE',
          growthEvent: {
            eventType: 'STRATEGY_CHANGE',
            description: 'Should not be allowed on a NEW candidate.',
            occurredAt: new Date().toISOString(),
            evidenceRefs: { sourceMessageIds: ['msg_1'] },
          },
        },
      ]),
    });

    await job.run();

    // The whole candidate is discarded by the schema's superRefine check
    // — not "create the state but drop the growthEvent."
    expect(txMock.userKnowledgeState.create).not.toHaveBeenCalled();
    expect(txMock.growthEvent.upsert).not.toHaveBeenCalled();
  });

  it('skips the LLM call entirely for a batch with no substantive user content, and still marks it consolidated', async () => {
    const { job, modelProviderMock, prismaMock } = await buildJob({
      chatMessages: [makeMessage({ role: 'assistant', content: 'How can I help?' })],
    });

    await job.run();

    expect(modelProviderMock.generateRiskNarrative).not.toHaveBeenCalled();
    expect(prismaMock.chatMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consolidatedAt: expect.any(Date) } }),
    );
  });

  it('leaves messages unconsolidated for retry when both model providers fail (llmResult is null)', async () => {
    const { job, prismaMock } = await buildJob({ llmResult: null });

    await job.run();

    expect(prismaMock.chatMessage.updateMany).not.toHaveBeenCalled();
  });

  it('aborts the write (without throwing out of run()) when a concurrent process already closed the active state', async () => {
    const { job, txMock, prismaMock } = await buildJob({
      currentActive: { id: 'active_1', belief: 'Only trades swing positions.' },
      closeCount: 0, // simulates another process winning the race
      llmResult: llmResponse([
        {
          topic: 'Trading Strategy',
          belief: 'Only trades day positions now.',
          stateType: 'PREFERENCE',
          suggestedProvenance: 'USER_STATED',
          changeType: 'CHANGED',
          permanence: 'DURABLE',
          growthEvent: null,
        },
      ]),
    });

    await expect(job.run()).resolves.not.toThrow();

    expect(txMock.userKnowledgeState.create).not.toHaveBeenCalled();
    // The message is still marked consolidated at the batch level — the
    // concurrent-modification case is logged and left for the *state* to
    // catch up next run via fingerprint/changeType re-evaluation, not by
    // reprocessing the same message forever.
    expect(prismaMock.chatMessage.updateMany).toHaveBeenCalled();
  });
});