import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import {
  Gravity,
  ImageMagick,
  initializeImageMagick,
  MagickColor,
  MagickFormat,
  NoiseType,
} from '@imagemagick/magick-wasm';

import {
  inspectMasterWithImageMagick,
  normalizeWithImageMagick,
  NORMALIZED_IMAGE_CONTRACT,
} from '../supabase/functions/_shared/activity-illustration-normalizer-core.mjs';
import { extractProviderImage } from '../supabase/functions/_shared/activity-illustration-image.ts';

const wasmUrl = import.meta.resolve('@imagemagick/magick-wasm/magick.wasm');
await initializeImageMagick(fs.readFileSync(new URL(wasmUrl)));
const dependencies = { ImageMagick, MagickFormat, Gravity };

function synthetic(width, height, format = MagickFormat.Png, options = {}) {
  return ImageMagick.read(new MagickColor(options.transparent ? '#00000000' : '#8B5CF6'), width, height, (image) => {
    if (options.noise) image.addNoise(NoiseType.Random);
    if (options.metadata) image.comment = 'synthetic-private-metadata';
    return image.write(format, (data) => Uint8Array.from(data));
  });
}

function normalize(bytes, declaredMimeType = 'image/png') {
  return normalizeWithImageMagick({ bytes, declaredMimeType }, dependencies);
}

function expectCode(code, callback) {
  assert.throws(callback, (error) => error instanceof Error && error.message === code);
}

for (const [name, input] of [
  ['valid square', synthetic(1024, 1024)],
  ['oversized square', synthetic(2048, 2048)],
  ['rectangular', synthetic(1400, 900)],
  ['transparent', synthetic(1024, 1024, MagickFormat.Png, { transparent: true })],
  ['metadata-bearing', synthetic(1024, 1024, MagickFormat.Png, { metadata: true })],
]) {
  const output = normalize(input);
  assert.equal(output.mimeType, NORMALIZED_IMAGE_CONTRACT.mimeType, name);
  assert.equal(output.width, 1024, name);
  assert.equal(output.height, 1024, name);
  assert.ok(output.bytes.length <= NORMALIZED_IMAGE_CONTRACT.maxBytes, name);
  inspectMasterWithImageMagick(output.bytes, dependencies);
  ImageMagick.read(output.bytes, (image) => {
    assert.equal(image.comment, null, `${name}: comment metadata remained`);
    assert.equal(image.profileNames.length, 0, `${name}: profile metadata remained`);
  });
}

expectCode('IMAGE_DIMENSIONS_TOO_SMALL', () => normalize(synthetic(128, 128)));
expectCode('IMAGE_DIMENSIONS_TOO_LARGE', () => normalize(synthetic(4097, 512)));
expectCode('IMAGE_MIME_CONTENT_MISMATCH', () => normalize(synthetic(1024, 1024, MagickFormat.Jpeg), 'image/png'));
expectCode('PROVIDER_IMAGE_MIME_UNSUPPORTED', () => normalize(synthetic(1024, 1024), 'image/gif'));
assert.throws(() => normalize(new Uint8Array([1, 2, 3, 4])), /image|blob|decode|header|corrupt|no decode delegate/i);

const oversizedBase64 = Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64');
expectCode('PROVIDER_IMAGE_SIZE_INVALID', () => extractProviderImage({
  candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: oversizedBase64 } }] } }],
}));

const noisy = normalize(synthetic(1024, 1024, MagickFormat.Png, { noise: true }));
assert.ok(noisy.bytes.length <= NORMALIZED_IMAGE_CONTRACT.maxBytes, 'noisy output exceeded byte contract');

console.log('Daily Adventures C.3A image normalization: PASS');
console.log('Synthetic cases: square, oversized, rectangular, malformed, fake MIME, mismatch, byte cap, transparent, small, metadata');
console.log(`Noisy WebP: ${noisy.bytes.length} bytes at quality ${noisy.quality}`);
