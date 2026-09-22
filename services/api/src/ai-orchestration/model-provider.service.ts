import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { GeminiProvider } from './gemini.provider';

const RISK_FRAMING_SYSTEM_PROMPT = `You are a financial risk-analysis assistant. You NEVER give directive buy/sell advice or tell the user what to do. You ONLY describe risk and probability in plain language — what is true about the portfolio's current risk exposure, framed as observations, not instructions. Do not use phrases like "you should sell" or "I recommend buying". Instead use framing like "this position represents elevated concentration risk" or "this holding is currently down X% from its cost basis".`;

export interface GenerateOptions {
  maxTokens?: number;
}

@Injectable()
export class ModelProviderService {
  private readonly logger = new Logger(ModelProviderService.name);
  private readonly client: Anthropic;
  private readonly modelName = 'claude-sonnet-4-6';

  constructor(private readonly geminiProvider: GeminiProvider) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generateRiskNarrative(
    userPrompt: string,
    options?: GenerateOptions,
  ): Promise<{
    text: string;
    modelProvider: string;
    modelName: string;
  } | null> {
    const maxTokens = options?.maxTokens ?? 2048;

    // Primary: Anthropic. If this fails for ANY reason (including the known
    // hackathon credit issue), fall back to Gemini rather than failing the
    // whole request — this is a TEMPORARY measure while credit is pending,
    // not a permanent architectural choice. Swap back once resolved.
    try {
      const message = await this.client.messages.create({
        model: this.modelName,
        max_tokens: maxTokens,
        system: RISK_FRAMING_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        return { text: textBlock.text, modelProvider: 'anthropic', modelName: this.modelName };
      }
      this.logger.warn('Anthropic returned no text block, falling back to Gemini');
    } catch (error) {
      this.logger.warn(`Anthropic API call failed, falling back to Gemini: ${error}`);
    }

    // --- Fallback: Gemini ---
    try {
      const geminiResult = await this.geminiProvider.generateCompletion({
        systemPrompt: RISK_FRAMING_SYSTEM_PROMPT,
        userPrompt,
        maxTokens,
      });
      return {
        text: geminiResult.text,
        modelProvider: geminiResult.modelProvider,
        modelName: geminiResult.modelName,
      };
    } catch (error) {
      this.logger.error('Both Anthropic and Gemini failed', error);
      return null;
    }
  }
}