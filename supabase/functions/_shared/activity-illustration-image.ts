export const MAX_PROVIDER_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ILLUSTRATION_BYTES = 750 * 1024;
export const TARGET_ILLUSTRATION_SIZE = 1024;
export const SUPPORTED_PROVIDER_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type ProviderImage = {
  bytes: Uint8Array;
  declaredMimeType: (typeof SUPPORTED_PROVIDER_MIME_TYPES)[number];
};

function decodeBase64(value: string) {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error('INVALID_IMAGE_BASE64');
  }
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
