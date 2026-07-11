// lib/worksheetAssetResolver.ts

import {
  AiAssetItem,
  findMissingAiAssets,
  getAiAssetByKey,
  normalizeAssetKey,
} from './aiAssetLibrary';

export type ResolvedWorksheetAsset = {
  key: string;
  asset: AiAssetItem | null;
  imageUrl: string | null;
  found: boolean;
};

export type WorksheetAssetResolution = {
  resolved: ResolvedWorksheetAsset[];
  found: AiAssetItem[];
  missing: string[];
  imageUrlsByKey: Record<string, string>;
};

export function normalizeWorksheetAssetKeys(assetKeys: string[]) {
  return Array.from(
    new Set(assetKeys.map(normalizeAssetKey).filter(Boolean))
  );
}

export async function resolveWorksheetAssets(
  assetKeys: string[]
): Promise<WorksheetAssetResolution> {
  const normalizedKeys = normalizeWorksheetAssetKeys(assetKeys);

  if (!normalizedKeys.length) {
    return {
      resolved: [],
      found: [],
      missing: [],
      imageUrlsByKey: {},
    };
  }

  const { found, missing } = await findMissingAiAssets(normalizedKeys);

  const foundByKey = new Map(found.map((asset) => [asset.asset_key, asset]));

  const resolved = normalizedKeys.map((key) => {
    const asset = foundByKey.get(key) || null;

    return {
      key,
      asset,
      imageUrl: asset?.image_url || null,
      found: Boolean(asset?.image_url),
    };
  });

  const imageUrlsByKey = resolved.reduce<Record<string, string>>((acc, item) => {
    if (item.imageUrl) {
      acc[item.key] = item.imageUrl;
    }

    return acc;
  }, {});

  return {
    resolved,
    found,
    missing,
    imageUrlsByKey,
  };
}

export async function resolveSingleWorksheetAsset(assetKey: string) {
  const normalizedKey = normalizeAssetKey(assetKey);

  if (!normalizedKey) return null;

  return getAiAssetByKey(normalizedKey);
}

export function getWorksheetAssetUrl(
  resolution: WorksheetAssetResolution,
  assetKey: string
) {
  const normalizedKey = normalizeAssetKey(assetKey);
  return resolution.imageUrlsByKey[normalizedKey] || null;
}

export function getMissingWorksheetAssetKeys(
  resolution: WorksheetAssetResolution
) {
  return resolution.missing;
}