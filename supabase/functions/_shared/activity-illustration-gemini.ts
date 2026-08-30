export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

export function createGeminiImageAdapter(fetchImpl: typeof fetch = fetch) {
  return async function generate(prompt: string, apiKey: string) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    let lastStatus = 0;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      });
      lastStatus = response.status;
      if (response.ok) return response.json();
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) break;
    }
    throw new Error(`PROVIDER_TRANSIENT_${lastStatus || 'NETWORK'}`);
  };
}
