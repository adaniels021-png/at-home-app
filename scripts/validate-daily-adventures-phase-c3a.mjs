import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const image = read('supabase/functions/_shared/activity-illustration-image.ts');
const provider = read('supabase/functions/_shared/activity-illustration-gemini.ts');
const generator = read('supabase/functions/generate-activity-illustration/index.ts');
const approval = read('supabase/functions/approve-activity-illustration/index.ts');
const generic = read('supabase/functions/generate-ai-asset-image/index.ts');
const migration = read('supabase/migrations/20260831121500_daily_adventures_direct_image_delivery.sql');

assert.match(image, /5 \* 1024 \* 1024/);
for (const mime of ['image/png', 'image/jpeg', 'image/webp']) assert.match(image, new RegExp(mime));
assert.match(image, /MIN_ILLUSTRATION_DIMENSION = 512/);
assert.match(image, /MAX_ILLUSTRATION_DIMENSION = 4096/);
assert.match(image, /inspectPng/);
assert.match(image, /inspectJpeg/);
assert.match(image, /inspectWebp/);
assert.match(generator, /validateActivityIllustration/);
assert.doesNotMatch(generator + approval, /ImageMagick|normalizeActivityIllustration|inspectNormalizedActivityIllustration/);
assert.match(approval, /DRAFT_INTEGRITY_FAILED/);
assert.match(approval, /image\.declaredMimeType/);
assert.match(migration, /5242880/);
assert.match(migration, /image\/png/);
assert.match(migration, /image\/jpeg/);
assert.match(migration, /image\/webp/);
assert.doesNotMatch(migration, /create policy|alter policy|20260830121000/i);
assert.match(provider, /\/v1beta\/models\/\$\{GEMINI_IMAGE_MODEL\}:generateContent/);
assert.match(provider, /responseModalities: \['TEXT', 'IMAGE'\]/);
assert.doesNotMatch(provider, /responseFormat|aspectRatio/);
assert.doesNotMatch(generic, /activity-illustration-drafts|validateActivityIllustration/);
assert.ok(!fs.existsSync('supabase/functions/_shared/activity-illustration-normalizer.ts'));
assert.ok(!fs.existsSync('supabase/functions/_shared/activity-illustration-normalizer-core.mjs'));
assert.doesNotMatch(read('package.json'), /@imagemagick\/magick-wasm/);

console.log('Daily Adventures Phase C.3A direct-image validator: PASS');
console.log('Deployment/Gemini operations: NONE');
