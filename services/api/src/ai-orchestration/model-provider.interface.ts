/**
 * Abstraction over any LLM backend, same architectural pattern as
 * MarketDataProvider — lets AiOrchestrationService swap between real
 * providers (Gemini now, Anthropic once hackathon credit lands) without
 * touching orchestration logic.
 */
export interface ModelCompletionRequest {
  systemPrompt: string;
  userPrompt: string; // the Evidence Package, serialized
  maxTokens?: number;
}

export interface ModelCompletionResult {
  text: string;
  modelProvider: string;
  modelName: string;
  promptTokens: number | null;
  completionTokens: number | null;
}

export interface ModelProvider {
  generateCompletion(request: ModelCompletionRequest): Promise<ModelCompletionResult>;
}