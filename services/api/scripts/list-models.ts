async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  );

  const raw = await response.text();
  console.log('STATUS:', response.status);

  try {
    const parsed = JSON.parse(raw);
    const models = parsed.models ?? [];
    console.log(`TOTAL MODELS: ${models.length}`);
    const embeddingModels = models.filter((m: any) =>
      (m.supportedGenerationMethods ?? []).includes('embedContent'),
    );
    console.log('\n--- Models supporting embedContent ---');
    for (const m of embeddingModels) {
      console.log(`${m.name}  (outputDim: ${m.outputDimensionality ?? 'n/a'})`);
    }
  } catch {
    console.log('RAW BODY:', raw);
  }
}

main();