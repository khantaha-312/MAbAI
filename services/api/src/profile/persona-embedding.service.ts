import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleEmbeddingProvider } from './google-embedding.provider';
import { buildPersonaText } from './persona-text.builder';

@Injectable()
export class PersonaEmbeddingService {
  private readonly logger = new Logger(PersonaEmbeddingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingProvider: GoogleEmbeddingProvider,
  ) {}

  async refreshPersonaEmbedding(userId: string, profile: Parameters<typeof buildPersonaText>[0]): Promise<void> {
    const text = buildPersonaText(profile);

    let values: number[];
    try {
      values = await this.embeddingProvider.embedText(text);
    } catch (err) {
      this.logger.error(`Failed to generate persona embedding for user ${userId}: ${err}`);
      return;
    }

    const vectorLiteral = `[${values.join(',')}]`;

    await this.prisma.$executeRaw`
      UPDATE "UserProfile"
      SET "personaEmbedding" = ${vectorLiteral}::vector
      WHERE "userId" = ${userId}
    `;

    this.logger.log(`Persona embedding refreshed for user ${userId}`);
  }
}