import { Injectable, Logger } from '@nestjs/common';
import type { ModelProvider, ModelCompletionRequest, ModelCompletionResult } from './model-provider.interface';

interface GeminiResponse {
  candidates?: {
    content: { parts: { text: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
  error?: { message: string };
}

@Injectable()
export class GeminiProvider implements ModelProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  // Flash, not Pro — confirmed free tier gives ~1,500 req/day on Flash vs.
  // Pro being paid-only as of mid-2026. Flash is the right free choice here.
  private readonly model = 'gemini-3.5-flash';
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  async generateCompletion(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts: [{ text: request.userPrompt }] }],
      systemInstruction: { parts: [{ text: request.systemPrompt }] },
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 1024,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok || data.error) {
      this.logger.error(`Gemini API error (status ${response.status}): ${JSON.stringify(data)}`);
      throw new Error(`Gemini API error: ${data.error?.message ?? response.statusText}`);
    }

    // Log finishReason for debugging truncation issues
    const finishReason = data.candidates?.[0]?.finishReason;
    this.logger.log(`Gemini generation finishReason: ${finishReason}`);

    // Fix: Read all parts, not just the first one (was causing text truncation)
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .join('') || undefined;
    
    if (!text) {
      throw new Error('Gemini returned no completion text');
    }

    return {
      text,
      modelProvider: 'google',
      modelName: this.model,
      promptTokens: data.usageMetadata?.promptTokenCount ?? null,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? null,
    };
  }
}