export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_PROVIDER_MESSAGE_LENGTH = 240;

export class GeminiImageProviderError extends Error {
  readonly stage = 'provider_request';
  readonly code: string;
  readonly httpStatus: number;
  readonly providerStatus: string | null;
  readonly providerMessage: string | null;
  readonly retryable: boolean;

  constructor(
    code: string,
    httpStatus: number,
    providerStatus: string | null,
    providerMessage: string | null,
    retryable: boolean,
  ) {
    super(code);
    this.name = 'GeminiImageProviderError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.providerStatus = providerStatus;
    this.providerMessage = providerMessage;
    this.retryable = retryable;
  }
}

function sanitizeProviderToken(value: unknown, maxLength: number, secrets: string[] = []) {
  if (typeof value !== 'string') return null;
  let redacted = value;
  for (const secret of secrets) {
    if (secret) redacted = redacted.split(secret).join('[REDACTED]');
  }
  const sanitized = redacted
    .replace(/AIza[0-9A-Za-z_-]+/g, '[REDACTED]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitized ? sanitized.slice(0, maxLength) : null;
}

async function providerFailure(response: Response, prompt: string, apiKey: string) {
  let payload: any = null;
  try {
    payload = JSON.parse(await response.text());
  } catch {
    // The raw response is intentionally discarded.
  }
  const providerStatus = sanitizeProviderToken(payload?.error?.status, 60);
  const providerMessage = sanitizeProviderToken(
    payload?.error?.message,
    MAX_PROVIDER_MESSAGE_LENGTH,
    [prompt, apiKey],
  );
  const retryable = RETRYABLE_STATUSES.has(response.status);
  const statusToken = providerStatus?.replace(/[^A-Z0-9_]/gi, '_').toUpperCase();
  const code = retryable
    ? `PROVIDER_TRANSIENT_${response.status}`
    : `PROVIDER_REQUEST_${response.status}${statusToken ? `_${statusToken}` : ''}`;
  return new GeminiImageProviderError(
    code.slice(0, 80),
    response.status,
    providerStatus,
    providerMessage,
    retryable,
  );
}

export function createGeminiImageAdapter(fetchImpl: typeof fetch = fetch) {
  return async function generate(prompt: string, apiKey: string) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    let lastError: GeminiImageProviderError | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      });
      if (response.ok) return response.json();
      lastError = await providerFailure(response, prompt, apiKey);
      if (!lastError.retryable || attempt === 3) throw lastError;
    }
    throw lastError || new GeminiImageProviderError(
      'PROVIDER_NETWORK_ERROR', 0, null, null, true,
    );
  };
}
