import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleEmbeddingProvider } from '../profile/google-embedding.provider';
import { ModelProviderService } from '../ai-orchestration/model-provider.service';
import { Prisma } from '@prisma/client';

export interface ChatTurnResult {
  answer: string;
  retrievedContextCount: number;
}

const RETRIEVAL_LIMIT = 5;

@Injectable()
export class ChatRagService {
  private readonly logger = new Logger(ChatRagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingProvider: GoogleEmbeddingProvider,
    private readonly modelProvider: ModelProviderService,
  ) {}

  /**
   * Stores a message with its embedding. Uses $executeRaw for the same
   * reason PersonaEmbeddingService does — Prisma cannot write to a
   * vector() column via its generated client.
   *
   * Degrades honestly: if embedding fails (e.g. GEMINI_API_KEY missing,
   * or the API errors), the message is still saved with a NULL embedding
   * rather than losing the chat message entirely — but it won't be
   * retrievable by future RAG lookups until backfilled. Logged, not
   * swallowed silently.
   */
  private async saveMessage(userId: string, role: 'user' | 'assistant', content: string, shouldEmbed = true): Promise<string> {
    const id = `chatmsg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    let embedding: number[] | null = null;
    if (shouldEmbed) {
      try {
        embedding = await this.embeddingProvider.embedText(content);
      } catch (error) {
        this.logger.error(`Failed to embed chat message for user ${userId}: ${error}`);
      }
    }

    if (embedding) {
      const vectorLiteral = `[${embedding.join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO "ChatMessage" (id, "userId", role, content, embedding, "createdAt")
        VALUES (${id}, ${userId}, ${role}, ${content}, ${vectorLiteral}::vector, NOW())
      `;
    } else {
      await this.prisma.$executeRaw`
        INSERT INTO "ChatMessage" (id, "userId", role, content, "createdAt")
        VALUES (${id}, ${userId}, ${role}, ${content}, NOW())
      `;
    }

    return id;
  }

  /**
   * Retrieves this user's own past messages most similar (cosine distance,
   * pgvector's <=> operator) to the new question. Same operator and query
   * shape as findRelatedLedgerEntriesForSimilarPersonas() in
   * AiOrchestrationService — proven pattern, applied to a new table.
   *
   * Scoped strictly to userId — this is per-user chat history, not
   * cross-user like the persona-similarity lookup. Excludes rows with a
   * NULL embedding (can't be ranked by distance).
   */
  private async retrieveRelevantHistory(userId: string, queryEmbedding: number[]): Promise<{ role: string; content: string }[]> {
    try {
      const vectorLiteral = `[${queryEmbedding.join(',')}]`;
      const rows = await this.prisma.$queryRaw<{ role: string; content: string }[]>(
        Prisma.sql`
          SELECT role, content
          FROM "ChatMessage"
          WHERE "userId" = ${userId}
            AND embedding IS NOT NULL
          ORDER BY embedding <=> ${vectorLiteral}::vector
          LIMIT ${RETRIEVAL_LIMIT}
        `,
      );
      return rows;
    } catch (error) {
      this.logger.error(`Failed to retrieve chat history for user ${userId}: ${error}`);
      return [];
    }
  }

  /**
   * Full RAG turn: embed the question, retrieve this user's relevant past
   * exchanges, build a prompt with that context, call the existing
   * ModelProviderService, store both the question and the answer.
   *
   * NOTE: ModelProviderService's real method name/signature is assumed
   * here as `generateRiskNarrative(prompt: string)` because that's the
   * only method confirmed in this conversation so far (used by
   * AiOrchestrationService). If chat needs a differently-tuned method —
   * different system prompt, different temperature — that's a real
   * decision for whoever owns that service, not something to guess here.
   */
  /**
   * Full text is always stored verbatim in the DB (see saveMessage) — this
   * only limits what gets injected into a future prompt as retrieved
   * context, to control token cost and avoid drowning a new question in
   * old, possibly very long answers. 300 chars is a starting point, not
   * tuned against real usage yet — adjust once you see real prompt sizes.
   */
  private truncateForContext(content: string, maxChars = 300): string {
    return content.length > maxChars ? `${content.slice(0, maxChars)}…` : content;
  }

  async handleChatTurn(userId: string, question: string): Promise<ChatTurnResult> {
    let questionEmbedding: number[] | null = null;
    try {
      questionEmbedding = await this.embeddingProvider.embedText(question);
    } catch (error) {
      this.logger.error(`Failed to embed incoming question for user ${userId}: ${error}`);
    }

    const history = questionEmbedding
      ? await this.retrieveRelevantHistory(userId, questionEmbedding)
      : [];

    const contextBlock = history.length
      ? `\n\nRelevant past exchanges with this user:\n${history
          .map((h) => `${h.role}: ${this.truncateForContext(h.content)}`)
          .join('\n')}`
      : '';

    const prompt = `You are a trading-concepts assistant. Answer the user's question clearly and accurately. Use the past exchanges below only if genuinely relevant — do not force a connection.${contextBlock}\n\nUser's new question: ${question}`;

    const result = await this.modelProvider.generateRiskNarrative(prompt);
    if (!result) {
      throw new Error('Model provider returned no result for chat turn');
    }

    // Only the question gets embedded — assistant answers are stored
    // verbatim for full conversation history/display, but skipping their
    // embedding halves embedding API calls and vector rows, since future
    // retrieval only ever needs to match new questions against past
    // questions, not past answers. If a workflow ever needs to search
    // answer content semantically, revisit this.
    await this.saveMessage(userId, 'user', question, true);
    await this.saveMessage(userId, 'assistant', result.text, false);

    return { answer: result.text, retrievedContextCount: history.length };
  }
}