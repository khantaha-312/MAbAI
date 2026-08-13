import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

const RISK_FRAMING_SYSTEM_PROMPT = `You are a financial risk-analysis assistant. You NEVER give directive buy/sell advice or tell the user what to do. You ONLY describe risk and probability in plain language — what is true about the portfolio's current risk exposure, framed as observations, not instructions. Do not use phrases like "you should sell" or "I recommend buying". Instead use framing like "this position represents elevated concentration risk" or "this holding is currently down X% from its cost basis".`;

@Injectable()
export class ModelProviderService {
  private readonly logger = new Logger(ModelProviderService.name);
  private readonly client: Anthropic;
  private readonly modelName = 'claude-sonnet-4-6';

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generateRiskNarrative(userPrompt: string): Promise<{
    text: string;
    modelProvider: string;
    modelName: string;
  } | null> {
    try {
      const message = await this.client.messages.create({
        model: this.modelName,
        max_tokens: 1024,
        system: RISK_FRAMING_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return null;
      }

      return {
        text: textBlock.text,
        modelProvider: 'anthropic',
        modelName: this.modelName,
      };
    } catch (error) {
      this.logger.error('Anthropic API call failed', error);
      return null;
    }
  }
}