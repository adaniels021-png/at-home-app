import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAX_ILLUSTRATION_BYTES,
  validateActivityIllustration,
} from '../supabase/functions/_shared/activity-illustration-image.ts';
import { sha256Hex } from '../supabase/functions/_shared/activity-illustration-prompt.ts';

const be16 = (value) => [value >> 8, value & 0xff];
const be32 = (value) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
const le16 = (value) => [value & 0xff, value >> 8];
const le24 = (value) => [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff];
const le32 = (value) => [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >>> 24) & 0xff];
const chars = (value) => [...value].map((character) => character.charCodeAt(0));

function png(width, height, size = 24) {
  const header = [0x89, ...chars('PNG'), 0x0d, 0x0a, 0x1a, 0x0a, ...be32(13), ...chars('IHDR'), ...be32(width), ...be32(height)];
  const bytes = new Uint8Array(size);
  bytes.set(header);
  return bytes;
}

function jpeg(width, height) {
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, ...be16(height), ...be16(width), 0x03, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0]);
}

function webpChunk(type, payload) {
  const riffSize = 4 + 8 + payload.length;
  return Uint8Array.from([...chars('RIFF'), ...le32(riffSize), ...chars('WEBP'), ...chars(type), ...le32(payload.length), ...payload]);
}

function vp8(width, height) {
  return webpChunk('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(width), ...le16(height)]);
}

function vp8l(width, height) {
  const w = width - 1;
  const h = height - 1;
  return webpChunk('VP8L', [0x2f, w & 0xff, ((w >> 8) & 0x3f) | ((h & 0x03) << 6), (h >> 2) & 0xff, (h >> 10) & 0x0f]);
}

function vp8x(width, height) {
  return webpChunk('VP8X', [0, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)]);
}

function validate(bytes, declaredMimeType) {
  return validateActivityIllustration({ bytes, declaredMimeType });
}

function expectCode(code, callback) {
  assert.throws(callback, (error) => error instanceof Error && error.message === code);
}

for (const [mime, extension, factory] of [
  ['image/png', 'png', png],
  ['image/jpeg', 'jpg', jpeg],
  ['image/webp', 'webp', vp8x],
]) {
  assert.equal(validate(factory(512, 512), mime).extension, extension);
  assert.equal(validate(factory(4096, 4096), mime).width, 4096);
  expectCode('IMAGE_DIMENSIONS_TOO_SMALL', () => validate(factory(511, 512), mime));
  expectCode('IMAGE_DIMENSIONS_TOO_LARGE', () => validate(factory(4097, 512), mime));
}

assert.deepEqual([vp8(800, 600), vp8l(800, 600), vp8x(800, 600)].map((bytes) => {
  const image = validate(bytes, 'image/webp');
  return [image.width, image.height];
}), [[800, 600], [800, 600], [800, 600]]);

expectCode('IMAGE_PNG_HEADER_INVALID', () => validate(new Uint8Array(24), 'image/png'));
expectCode('IMAGE_JPEG_HEADER_TRUNCATED', () => validate(Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0, 17]), 'image/jpeg'));
expectCode('IMAGE_WEBP_HEADER_TRUNCATED', () => validate(vp8x(512, 512).slice(0, 24), 'image/webp'));
expectCode('IMAGE_PNG_HEADER_INVALID', () => validate(jpeg(512, 512), 'image/png'));
expectCode('IMAGE_JPEG_HEADER_INVALID', () => validate(png(512, 512), 'image/jpeg'));
expectCode('IMAGE_WEBP_HEADER_INVALID', () => validate(png(512, 512), 'image/webp'));

assert.equal(validate(png(512, 512, MAX_ILLUSTRATION_BYTES), 'image/png').bytes.length, MAX_ILLUSTRATION_BYTES);
expectCode('IMAGE_SIZE_INVALID', () => validate(png(512, 512, MAX_ILLUSTRATION_BYTES + 1), 'image/png'));

const bytes = png(1024, 1024);
const hash = await sha256Hex(bytes);
assert.match(hash, /^[0-9a-f]{64}$/);
assert.equal(await sha256Hex(bytes), hash);
assert.notEqual(await sha256Hex(png(1025, 1024)), hash);

const approval = fs.readFileSync('supabase/functions/approve-activity-illustration/index.ts', 'utf8');
assert.match(approval, /DRAFT_INTEGRITY_FAILED/);
for (const field of ['sha256', 'mime_type', 'width', 'height', 'byte_size']) assert.match(approval, new RegExp(`candidate\\.${field}`));
assert.match(approval, /\.\$\{image\.extension\}/);

console.log('Daily Adventures direct-image validation: PASS');
console.log('PNG/JPEG/WebP headers, bounds, size, paths, and approval integrity: PASS');
console.log('Real Gemini calls: 0');
