import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  createGeminiImageAdapter,
  GEMINI_IMAGE_MODEL,
  GeminiImageProviderError,
} from '../supabase/functions/_shared/activity-illustration-gemini.ts';
import { extractProviderImage } from '../supabase/functions/_shared/activity-illustration-image.ts';

const prompt = 'SERVER OWNED PROMPT SENTINEL';
const apiKey = 'AIza_TEST_SECRET_SENTINEL';
const png = btoa('mock-png');
const successPayload = {
  candidates: [{ content: { parts: [{ text: 'optional text' }, { inlineData: { mimeType: 'image/png', data: png } }] } }],
};

const calls = [];
const adapter = createGeminiImageAdapter(async (url, init) => {
  calls.push({ url: String(url), init });
  return new Response(JSON.stringify(successPayload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
const payload = await adapter(prompt, apiKey);
assert.equal(calls.length, 1);
assert.match(calls[0].url, new RegExp(`/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent\\?key=`));
assert.ok(calls[0].url.includes(encodeURIComponent(apiKey)));
const request = JSON.parse(calls[0].init.body);
assert.deepEqual(request.contents, [{ role: 'user', parts: [{ text: prompt }] }]);
assert.deepEqual(request.generationConfig, { responseModalities: ['TEXT', 'IMAGE'] });
assert.equal('responseFormat' in request.generationConfig, false);
assert.equal(JSON.stringify(request).includes('aspectRatio'), false);
assert.equal(JSON.stringify(request).includes(apiKey), false);
assert.equal(extractProviderImage(payload).declaredMimeType, 'image/png');

const snakeImage = extractProviderImage({
  candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/jpeg', data: png } }] } }],
});
assert.equal(snakeImage.declaredMimeType, 'image/jpeg');
assert.throws(() => extractProviderImage({ candidates: [{ content: { parts: [{ text: 'only text' }] } }] }));

let badRequestCalls = 0;
const badRequest = createGeminiImageAdapter(async () => {
  badRequestCalls += 1;
  return new Response(JSON.stringify({
    error: {
      code: 400,
      status: 'INVALID_ARGUMENT',
      message: `Invalid image configuration ${apiKey} ${prompt} ${'x'.repeat(400)}`,
    },
  }), { status: 400 });
});
await assert.rejects(
  () => badRequest(prompt, apiKey),
  (error) => {
    assert.ok(error instanceof GeminiImageProviderError);
    assert.equal(error.code, 'PROVIDER_REQUEST_400_INVALID_ARGUMENT');
    assert.equal(error.retryable, false);
    assert.equal(error.httpStatus, 400);
    assert.equal(error.providerStatus, 'INVALID_ARGUMENT');
    assert.ok(error.providerMessage.length <= 240);
    assert.equal(error.providerMessage.includes(apiKey), false);
    assert.equal(error.providerMessage.includes(prompt), false);
    assert.equal(error.message.includes(prompt), false);
    assert.equal(JSON.stringify(error).includes(apiKey), false);
    assert.equal(JSON.stringify(error).includes(prompt), false);
    return true;
  },
);
assert.equal(badRequestCalls, 1, 'HTTP 400 must not retry');

let rateLimitCalls = 0;
const rateLimited = createGeminiImageAdapter(async () => {
  rateLimitCalls += 1;
  if (rateLimitCalls === 1) {
    return new Response(JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'Try later' } }), { status: 429 });
  }
  return new Response(JSON.stringify(successPayload), { status: 200 });
});
assert.ok(await rateLimited(prompt, apiKey));
assert.equal(rateLimitCalls, 2, 'HTTP 429 should retry');

let serverErrorCalls = 0;
const serverFailure = createGeminiImageAdapter(async () => {
  serverErrorCalls += 1;
  return new Response(JSON.stringify({ error: { status: 'UNAVAILABLE', message: 'Provider unavailable' } }), { status: 503 });
});
await assert.rejects(
  () => serverFailure(prompt, apiKey),
  (error) => error instanceof GeminiImageProviderError && error.retryable === true,
);
assert.equal(serverErrorCalls, 3, 'retryable 5xx should use the bounded retry policy');

const activityGenerator = fs.readFileSync('supabase/functions/generate-activity-illustration/index.ts', 'utf8');
const genericGenerator = fs.readFileSync('supabase/functions/generate-ai-asset-image/index.ts', 'utf8');
const adminUi = fs.readFileSync('components/admin/ActivityIllustrationAdminSection.tsx', 'utf8');
assert.match(activityGenerator, /ALLOWED_FIELDS/);
assert.doesNotMatch(activityGenerator, /['"]prompt['"]\s*,?\s*(?:\]|$)/);
assert.match(activityGenerator, /normalizeActivityIllustration\(extractProviderImage\(providerPayload\)\)/);
assert.match(adminUi, /refreshPersistedFailure/);
assert.match(adminUi, /refreshed\.candidate\?\.status === 'failed'/);

// Protect the established generator contract without making it import the new adapter.
assert.match(genericGenerator, /\/v1beta\/models\/\$\{GEMINI_MODEL\}:generateContent/);
assert.match(genericGenerator, /responseModalities: \['TEXT', 'IMAGE'\]/);
assert.doesNotMatch(genericGenerator, /activity-illustration-gemini/);

console.log('Daily Adventures Gemini provider contract tests: PASS');
console.log('Mock provider calls only; real Gemini calls: 0');
