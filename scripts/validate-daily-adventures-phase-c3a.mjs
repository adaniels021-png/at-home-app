import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const ui = read('components/admin/ActivityIllustrationAdminSection.tsx');
const api = read('lib/adminActivityIllustrations.ts');
const errors = read('lib/adminActivityIllustrationErrors.ts');
const normalizer = read('supabase/functions/_shared/activity-illustration-normalizer-core.mjs');
const adapter = read('supabase/functions/_shared/activity-illustration-normalizer.ts');
const provider = read('supabase/functions/_shared/activity-illustration-gemini.ts');
const generator = read('supabase/functions/generate-activity-illustration/index.ts');
const generic = read('supabase/functions/generate-ai-asset-image/index.ts');
const edit = read('app/admin/activity-library/edit.tsx');

assert.doesNotMatch(ui, /Alert\.alert\(['"]Illustration Error/);
assert.match(ui, /Illustration tools aren&apos;t available in this environment yet/);
assert.match(ui, /Activity editing remains available/);
assert.match(ui, /Illustration tools need attention/);
assert.match(ui, /isIllustrationBackendUnavailable/);
assert.match(errors, /error\?\.code === 'PGRST202'/);
assert.match(errors, /get_admin_activity_illustration_state/);
assert.match(errors, /schema cache/);
assert.match(errors, /error\.context\.status === 404/);
assert.match(errors, /Illustration status is temporarily unavailable/);
assert.doesNotMatch(api, /throw error;/);
assert.match(edit, /ActivityIllustrationAdminSection/);

assert.match(adapter, /@imagemagick\/magick-wasm@0\.0\.43/);
assert.match(normalizer, /mimeType: 'image\/webp'/);
assert.match(normalizer, /width: 1024/);
assert.match(normalizer, /height: 1024/);
assert.match(normalizer, /maxBytes: 750 \* 1024/);
assert.match(normalizer, /image\.autoOrient\(\)/);
assert.match(normalizer, /image\.crop/);
assert.match(normalizer, /image\.resize\(1024, 1024\)/);
assert.match(normalizer, /image\.strip\(\)/);
assert.match(normalizer, /\[84, 80, 76, 72\]/);
assert.match(provider, /\/v1beta\/models\/\$\{GEMINI_IMAGE_MODEL\}:generateContent/);
assert.match(provider, /responseModalities: \['TEXT', 'IMAGE'\]/);
assert.doesNotMatch(provider, /responseFormat/);
assert.doesNotMatch(provider, /aspectRatio/);
assert.match(provider, /PROVIDER_REQUEST_/);
assert.match(provider, /RETRYABLE_STATUSES/);
assert.match(generator, /normalizeActivityIllustration/);

assert.doesNotMatch(generic, /activity-illustration-normalizer/);
assert.doesNotMatch(generator + adapter + normalizer, /functions deploy|migration up|db push|GEMINI_API_KEY\s*=/i);
assert.doesNotMatch(read('app/admin/activity-library/ai-generate.tsx'), /generate-activity-illustration/);
assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/20260830121000_daily_adventures_phase_a_rls_cutover.sql')));
assert.doesNotMatch(generator + ui + api, /bun bun/i);

console.log('Daily Adventures Phase C.3A validator: PASS');
console.log('Backend-unavailable classification: narrow and non-blocking');
console.log('Normalizer contract: 1024x1024 WebP, <=750 KB, stripped metadata');
console.log('Deployment/Gemini operations: NONE');
