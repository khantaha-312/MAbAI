import { GeminiProvider } from './gemini.provider';

describe('GeminiProvider', () => {
  const provider = new GeminiProvider();
  const originalFetch = global.fetch;
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalEnv;
  });

  it('throws clearly when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      provider.generateCompletion({ systemPrompt: 'x', userPrompt: 'y' }),
    ).rejects.toThrow('GEMINI_API_KEY is not set');
  });

  it('parses a successful response correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ 
          content: { parts: [{ text: 'Real analysis text' }] },
          finishReason: 'STOP',
        }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      }),
    }) as any;

    const result = await provider.generateCompletion({ systemPrompt: 'sys', userPrompt: 'user' });

    expect(result.text).toBe('Real analysis text');
    expect(result.modelProvider).toBe('google');
    expect(result.promptTokens).toBe(100);
    expect(result.completionTokens).toBe(50);
  });

  it('throws when Gemini returns an error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid request' } }),
    }) as any;

    await expect(
      provider.generateCompletion({ systemPrompt: 'x', userPrompt: 'y' }),
    ).rejects.toThrow('Gemini API error');
  });

  it('throws when response has no usable text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    }) as any;

    await expect(
      provider.generateCompletion({ systemPrompt: 'x', userPrompt: 'y' }),
    ).rejects.toThrow('Gemini returned no completion text');
  });

  it('concatenates multiple parts correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ 
          content: { parts: [{ text: 'First part' }, { text: ' second part' }, { text: ' third part' }] },
          finishReason: 'STOP',
        }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      }),
    }) as any;

    const result = await provider.generateCompletion({ systemPrompt: 'sys', userPrompt: 'user' });

    expect(result.text).toBe('First part second part third part');
    expect(result.modelProvider).toBe('google');
  });
});