import 'dotenv/config';
import { GeminiProvider } from '../src/ai-orchestration/gemini.provider';

async function main() {
  const provider = new GeminiProvider();
  try {
    const result = await provider.generateCompletion({
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Say hello in one sentence.',
    });
    console.log('SUCCESS:', result);
  } catch (err) {
    console.error('FAILED:', err);
  }
}

main();