import {
  Gravity,
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from 'npm:@imagemagick/magick-wasm@0.0.43';

import {
  inspectMasterWithImageMagick,
  normalizeWithImageMagick,
} from './activity-illustration-normalizer-core.mjs';
import type { ProviderImage } from './activity-illustration-image.ts';

let initialization: Promise<void> | null = null;

function initialize() {
  if (!initialization) {
    initialization = (async () => {
      const wasmUrl = new URL(
        'magick.wasm',
        import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.43'),
      );
      await initializeImageMagick(await Deno.readFile(wasmUrl));
    })();
  }
  return initialization;
}

const dependencies = { ImageMagick, MagickFormat, Gravity };

export async function normalizeActivityIllustration(input: ProviderImage) {
  await initialize();
  return normalizeWithImageMagick(input, dependencies);
}

export async function inspectNormalizedActivityIllustration(bytes: Uint8Array) {
  await initialize();
  return inspectMasterWithImageMagick(bytes, dependencies);
}
