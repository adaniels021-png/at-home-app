export const MAX_ILLUSTRATION_BYTES = 750 * 1024;
export const TARGET_ILLUSTRATION_SIZE = 1024;

export type ValidatedImage = {
  bytes: Uint8Array;
  mimeType: 'image/webp';
  width: number;
  height: number;
};

function decodeBase64(value: string) {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error('INVALID_IMAGE_BASE64');
  }
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function readWebpDimensions(bytes: Uint8Array) {
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length));
  if (bytes.length < 30 || ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP') {
    throw new Error('INVALID_WEBP');
  }
  const chunk = ascii(12, 4);
  if (chunk === 'VP8X') {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return { width, height };
  }
  throw new Error('UNSUPPORTED_WEBP_LAYOUT');
}

export function validatePersistedWebp(bytes: Uint8Array): ValidatedImage {
  if (bytes.length === 0 || bytes.length > MAX_ILLUSTRATION_BYTES) {
    throw new Error('IMAGE_SIZE_INVALID');
  }
  const { width, height } = readWebpDimensions(bytes);
  if (width !== TARGET_ILLUSTRATION_SIZE || height !== TARGET_ILLUSTRATION_SIZE) {
    throw new Error('NORMALIZATION_REQUIRED');
  }
  return { bytes, mimeType: 'image/webp', width, height };
}

export function validateProviderImageResponse(payload: unknown): ValidatedImage {
  const parts = (payload as any)?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) throw new Error('PROVIDER_IMAGE_MISSING');
  const images = parts
    .map((part: any) => part?.inlineData || part?.inline_data)
    .filter((item: any) => item?.data);
  if (images.length !== 1) throw new Error('PROVIDER_IMAGE_COUNT_INVALID');
  const image = images[0];
  const mimeType = image.mimeType || image.mime_type;
  if (mimeType !== 'image/webp') throw new Error('NORMALIZATION_REQUIRED');
  const bytes = decodeBase64(image.data);
  return validatePersistedWebp(bytes);
}

// Deno Edge has no built-in, verified WebP transcoder. C.3 therefore accepts
// only provider-native assets already satisfying the persisted master contract.
export const IMAGE_NORMALIZATION_STATUS = 'BLOCKED_PROVIDER_NATIVE_ONLY' as const;
