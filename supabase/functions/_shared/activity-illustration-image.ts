export const MAX_PROVIDER_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ILLUSTRATION_BYTES = MAX_PROVIDER_IMAGE_BYTES;
export const MIN_ILLUSTRATION_DIMENSION = 512;
export const MAX_ILLUSTRATION_DIMENSION = 4096;
export const SUPPORTED_PROVIDER_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type ProviderImage = {
  bytes: Uint8Array;
  declaredMimeType: (typeof SUPPORTED_PROVIDER_MIME_TYPES)[number];
};

export type ValidatedActivityIllustration = ProviderImage & {
  width: number;
  height: number;
  extension: 'png' | 'jpg' | 'webp';
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function matches(bytes: Uint8Array, offset: number, values: number[]) {
  return values.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, value: string) {
  return [...value].every((character, index) =>
    bytes[offset + index] === character.charCodeAt(0));
}

function uint16be(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function uint16le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function uint24le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function uint32be(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function uint32le(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

function inspectPng(bytes: Uint8Array) {
  if (bytes.length < 24 || !matches(bytes, 0, PNG_SIGNATURE) || !ascii(bytes, 12, 'IHDR')) {
    throw new Error('IMAGE_PNG_HEADER_INVALID');
  }
  const ihdrLength = uint32be(bytes, 8);
  if (ihdrLength !== 13) throw new Error('IMAGE_PNG_HEADER_INVALID');
  return { width: uint32be(bytes, 16), height: uint32be(bytes, 20) };
}

function inspectJpeg(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('IMAGE_JPEG_HEADER_INVALID');
  }
  let offset = 2;
  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) throw new Error('IMAGE_JPEG_HEADER_TRUNCATED');
    const length = uint16be(bytes, offset);
    if (length < 2 || offset + length > bytes.length) {
      throw new Error('IMAGE_JPEG_HEADER_TRUNCATED');
    }
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (length < 7) throw new Error('IMAGE_JPEG_HEADER_INVALID');
      return { width: uint16be(bytes, offset + 5), height: uint16be(bytes, offset + 3) };
    }
    offset += length;
  }
  throw new Error('IMAGE_JPEG_DIMENSIONS_MISSING');
}

function inspectWebp(bytes: Uint8Array) {
  if (bytes.length < 20 || !ascii(bytes, 0, 'RIFF') || !ascii(bytes, 8, 'WEBP')) {
    throw new Error('IMAGE_WEBP_HEADER_INVALID');
  }
  const riffEnd = uint32le(bytes, 4) + 8;
  if (riffEnd > bytes.length || riffEnd < 20) throw new Error('IMAGE_WEBP_HEADER_TRUNCATED');
  const chunkSize = uint32le(bytes, 16);
  if (20 + chunkSize > riffEnd) throw new Error('IMAGE_WEBP_HEADER_TRUNCATED');
  if (ascii(bytes, 12, 'VP8X')) {
    if (chunkSize < 10) throw new Error('IMAGE_WEBP_HEADER_TRUNCATED');
    return { width: uint24le(bytes, 24) + 1, height: uint24le(bytes, 27) + 1 };
  }
  if (ascii(bytes, 12, 'VP8L')) {
    if (chunkSize < 5 || bytes[20] !== 0x2f) throw new Error('IMAGE_WEBP_HEADER_INVALID');
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
    };
  }
  if (ascii(bytes, 12, 'VP8 ')) {
    if (chunkSize < 10 || !matches(bytes, 23, [0x9d, 0x01, 0x2a])) {
      throw new Error('IMAGE_WEBP_HEADER_INVALID');
    }
    return {
      width: uint16le(bytes, 26) & 0x3fff,
      height: uint16le(bytes, 28) & 0x3fff,
    };
  }
  throw new Error('IMAGE_WEBP_FORMAT_UNSUPPORTED');
}

export function extensionForActivityIllustrationMime(
  mimeType: ProviderImage['declaredMimeType'],
) {
  if (mimeType === 'image/png') return 'png' as const;
  if (mimeType === 'image/jpeg') return 'jpg' as const;
  return 'webp' as const;
}

export function validateActivityIllustration(
  input: ProviderImage,
): ValidatedActivityIllustration {
  if (!input.bytes.length || input.bytes.length > MAX_ILLUSTRATION_BYTES) {
    throw new Error('IMAGE_SIZE_INVALID');
  }
  let dimensions: { width: number; height: number };
  if (input.declaredMimeType === 'image/png') dimensions = inspectPng(input.bytes);
  else if (input.declaredMimeType === 'image/jpeg') dimensions = inspectJpeg(input.bytes);
  else if (input.declaredMimeType === 'image/webp') dimensions = inspectWebp(input.bytes);
  else throw new Error('PROVIDER_IMAGE_MIME_UNSUPPORTED');
  if (
    dimensions.width < MIN_ILLUSTRATION_DIMENSION ||
    dimensions.height < MIN_ILLUSTRATION_DIMENSION
  ) throw new Error('IMAGE_DIMENSIONS_TOO_SMALL');
  if (
    dimensions.width > MAX_ILLUSTRATION_DIMENSION ||
    dimensions.height > MAX_ILLUSTRATION_DIMENSION
  ) throw new Error('IMAGE_DIMENSIONS_TOO_LARGE');
  return {
    ...input,
    ...dimensions,
    extension: extensionForActivityIllustrationMime(input.declaredMimeType),
  };
}

function decodeBase64(value: string) {
  const maxEncodedLength = Math.ceil(MAX_PROVIDER_IMAGE_BYTES / 3) * 4;
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error('INVALID_IMAGE_BASE64');
  }
  if (value.length > maxEncodedLength) throw new Error('PROVIDER_IMAGE_SIZE_INVALID');
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.length === 0 || bytes.length > MAX_PROVIDER_IMAGE_BYTES) {
    throw new Error('PROVIDER_IMAGE_SIZE_INVALID');
  }
  return bytes;
}

export function extractProviderImage(payload: unknown): ProviderImage {
  const candidates = (payload as any)?.candidates;
  if (!Array.isArray(candidates) || candidates.length !== 1) {
    throw new Error('PROVIDER_CANDIDATE_COUNT_INVALID');
  }
  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) throw new Error('PROVIDER_IMAGE_MISSING');
  const images = parts
    .map((part: any) => part?.inlineData || part?.inline_data)
    .filter((item: any) => item?.data);
  if (images.length !== 1) throw new Error('PROVIDER_IMAGE_COUNT_INVALID');
  const image = images[0];
  const declaredMimeType = image.mimeType || image.mime_type;
  if (!SUPPORTED_PROVIDER_MIME_TYPES.includes(declaredMimeType)) {
    throw new Error('PROVIDER_IMAGE_MIME_UNSUPPORTED');
  }
  return { bytes: decodeBase64(image.data), declaredMimeType };
}
