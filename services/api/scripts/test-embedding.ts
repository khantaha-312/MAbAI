async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: 'test persona: futures trader, scalping style, high leverage tolerance' }] },
        outputDimensionality: 768,
      }),
    },
  );

  const raw = await response.text();
  console.log('STATUS:', response.status);
  console.log('RAW BODY:', raw);
}

main();