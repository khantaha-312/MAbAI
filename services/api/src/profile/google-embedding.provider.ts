import { Injectable, Logger } from '@nestjs/common';

/**
 * Model corrected from originally-assumed 'text-embedding-005' (404, does not
 * exist for this API/key) to the real available model 'gemini-embedding-001',
 * confirmed via GET /v1beta/models. outputDimensionality explicitly requested
 * as 768 to match the vector(768) column — this model does not default to 768,
 * per Google's docs. STILL UNVERIFIED: the exact real response field path
 * below, pending one real embedContent call.
 */
@Injectable()
export class GoogleEmbeddingProvider {
  private readonly logger = new Logger(GoogleEmbeddingProvider.name);
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

  async embedText(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      this.logger.error(`Embedding request failed: ${response.status} ${errBody}`);
      throw new Error(`Google embedding API error: ${response.status}`);
    }

    const data = await response.json();
    const values = data?.embedding?.values;

    if (!Array.isArray(values) || values.length !== 768) {
      this.logger.error(`Unexpected embedding response shape: ${JSON.stringify(data)}`);
      throw new Error('Unexpected embedding response shape or wrong dimension count');
    }

    return values;
  }
}