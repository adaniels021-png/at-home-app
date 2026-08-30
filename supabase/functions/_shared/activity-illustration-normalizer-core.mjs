const MIME_TO_FORMAT = {
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'WEBP',
};

export const NORMALIZED_IMAGE_CONTRACT = Object.freeze({
  mimeType: 'image/webp',
  width: 1024,
  height: 1024,
  preferredQuality: 84,
  minimumQuality: 72,
  maxBytes: 750 * 1024,
  minimumInputDimension: 512,
  maximumInputDimension: 4096,
});

function normalizeDetectedFormat(value) {
  const format = String(value || '').toUpperCase();
  if (format === 'JPG' || format === 'JPEG') return 'JPEG';
  if (format.startsWith('PNG')) return 'PNG';
  if (format === 'WEBP') return 'WEBP';
  return format;
}

export function normalizeWithImageMagick(input, dependencies) {
  const { ImageMagick, MagickFormat, Gravity } = dependencies;
  const expectedFormat = MIME_TO_FORMAT[input.declaredMimeType];
  if (!expectedFormat) throw new Error('PROVIDER_IMAGE_MIME_UNSUPPORTED');

  return ImageMagick.read(input.bytes, (image) => {
    const detectedFormat = normalizeDetectedFormat(image.format);
    if (detectedFormat !== expectedFormat) throw new Error('IMAGE_MIME_CONTENT_MISMATCH');
    image.autoOrient();
    if (
      image.width < NORMALIZED_IMAGE_CONTRACT.minimumInputDimension ||
      image.height < NORMALIZED_IMAGE_CONTRACT.minimumInputDimension
    ) throw new Error('IMAGE_DIMENSIONS_TOO_SMALL');
    if (
      image.width > NORMALIZED_IMAGE_CONTRACT.maximumInputDimension ||
      image.height > NORMALIZED_IMAGE_CONTRACT.maximumInputDimension
    ) throw new Error('IMAGE_DIMENSIONS_TOO_LARGE');

    if (image.width !== image.height) {
      const side = Math.min(image.width, image.height);
      image.crop(side, side, Gravity.Center);
      image.resetPage();
    }
    if (image.width !== 1024 || image.height !== 1024) image.resize(1024, 1024);
    image.strip();
    image.settings.setDefine(MagickFormat.WebP, 'method', 4);
    image.settings.setDefine(MagickFormat.WebP, 'thread-level', 0);
    image.settings.setDefine(MagickFormat.WebP, 'low-memory', true);

    for (const quality of [84, 80, 76, 72]) {
      image.quality = quality;
      const encoded = image.write(MagickFormat.WebP, (data) => Uint8Array.from(data));
      if (encoded.length <= NORMALIZED_IMAGE_CONTRACT.maxBytes) {
        return {
          bytes: encoded,
          mimeType: 'image/webp',
          width: 1024,
          height: 1024,
          quality,
          metadataStripped: true,
        };
      }
    }
    throw new Error('NORMALIZED_IMAGE_TOO_LARGE');
  });
}

export function inspectMasterWithImageMagick(bytes, dependencies) {
  const { ImageMagick } = dependencies;
  if (!bytes.length || bytes.length > NORMALIZED_IMAGE_CONTRACT.maxBytes) {
    throw new Error('IMAGE_SIZE_INVALID');
  }
  return ImageMagick.read(bytes, (image) => {
    if (
      normalizeDetectedFormat(image.format) !== 'WEBP' ||
      image.width !== 1024 ||
      image.height !== 1024
    ) throw new Error('INVALID_NORMALIZED_MASTER');
    return { bytes, mimeType: 'image/webp', width: 1024, height: 1024 };
  });
}
