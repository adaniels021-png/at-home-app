// lib/aiAssetLibrary.ts

import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export type AiAssetType =
  | 'object'
  | 'character'
  | 'person'
  | 'action'
  | 'emotion'
  | 'background'
  | 'decoration'
  | 'icon'
  | 'reward'
  | 'pecs'
  | 'other';

export type AiAssetUsageScope =
  | 'worksheets'
  | 'lessons'
  | 'activities'
  | 'routine_defaults'
  | 'pecs_defaults'
  | 'calm_tools'
  | 'app_visuals';

export type AiAssetItem = {
  id: string;
  asset_key: string;
  title: string;
  description: string | null;
  asset_type: AiAssetType | null;
  primary_category: string | null;
  secondary_category: string | null;
  primary_skill: string | null;
  style: string | null;
  usage_scope: AiAssetUsageScope[] | null;
  age_range: string | null;
  tags: string[] | null;
  transparent: boolean | null;
  bun_bun_ready: boolean | null;
  premium: boolean | null;
  image_url: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  created_at?: string;
  updated_at?: string;
};

export type UploadAiAssetInput = {
  localUri: string;
  assetKey: string;
  title: string;
  description?: string;
  assetType?: AiAssetType;
  primaryCategory?: string;
  secondaryCategory?: string;
  primarySkill?: string;
  style?: string;
  usageScope?: AiAssetUsageScope[];
  ageRange?: string;
  tags?: string[];
  transparent?: boolean;
  bunBunReady?: boolean;
  premium?: boolean;
};

const BUCKET_NAME = 'worksheet-art';

export function normalizeAssetKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeList(values?: string[]) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function getFileExtension(uri: string) {
  const cleanUri = uri.split('?')[0];
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() || 'png';
}

function getMimeType(extension: string) {
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  return 'image/png';
}

function buildStoragePath(assetKey: string, extension: string) {
  return `ai-assets/${assetKey}.${extension}`;
}

export async function uploadAiAsset(input: UploadAiAssetInput) {
  const assetKey = normalizeAssetKey(input.assetKey);

  if (!assetKey) {
    throw new Error('Asset key is required.');
  }

  if (!input.localUri) {
    throw new Error('Image file is required.');
  }

  const extension = getFileExtension(input.localUri);
  const mimeType = getMimeType(extension);
  const storagePath = buildStoragePath(assetKey, extension);

const base64 = await FileSystem.readAsStringAsync(input.localUri, {
  encoding: 'base64',
});

  const fileBody = decode(base64);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBody, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
  throw new Error(`Storage upload failed: ${uploadError.message}`);
}

  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const record = {
    asset_key: assetKey,
    title: input.title.trim() || assetKey,
    description: input.description?.trim() || null,
    asset_type: input.assetType || 'object',
    primary_category: input.primaryCategory?.trim() || null,
    secondary_category: input.secondaryCategory?.trim() || null,
    primary_skill: input.primarySkill?.trim() || null,
    style: input.style?.trim() || 'Premium Cartoon',
    usage_scope: input.usageScope?.length ? input.usageScope : ['worksheets'],
    age_range: input.ageRange?.trim() || null,
    tags: normalizeList(input.tags),
    transparent: input.transparent ?? true,
    bun_bun_ready: input.bunBunReady ?? false,
    premium: input.premium ?? true,
    image_url: publicData.publicUrl,
    storage_path: storagePath,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ai_assets')
    .upsert(record, { onConflict: 'asset_key' })
    .select('*')
    .single();

  if (error) {
  throw new Error(`Database save failed: ${error.message}`);
}

  return data as AiAssetItem;
}

export async function listAiAssets() {
  const { data, error } = await supabase
    .from('ai_assets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
  throw new Error(`Database save failed: ${error.message}`);
}

  return (data || []) as AiAssetItem[];
}

export async function getAiAssetByKey(assetKey: string) {
  const normalizedKey = normalizeAssetKey(assetKey);

  const { data, error } = await supabase
    .from('ai_assets')
    .select('*')
    .eq('asset_key', normalizedKey)
    .maybeSingle();

  if (error) throw error;

  return data as AiAssetItem | null;
}

export async function searchAiAssets(query: string) {
  const term = query.trim();

  if (!term) return listAiAssets();

  const { data, error } = await supabase
    .from('ai_assets')
    .select('*')
    .or(
      `asset_key.ilike.%${term}%,title.ilike.%${term}%,description.ilike.%${term}%,asset_type.ilike.%${term}%,primary_category.ilike.%${term}%,secondary_category.ilike.%${term}%,primary_skill.ilike.%${term}%,style.ilike.%${term}%,age_range.ilike.%${term}%`
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []) as AiAssetItem[];
}

export async function findMissingAiAssets(assetKeys: string[]) {
  const normalizedKeys = assetKeys.map(normalizeAssetKey).filter(Boolean);

  if (!normalizedKeys.length) {
    return {
      found: [] as AiAssetItem[],
      missing: [] as string[],
    };
  }

  const { data, error } = await supabase
    .from('ai_assets')
    .select('*')
    .in('asset_key', normalizedKeys);

  if (error) throw error;

  const found = (data || []) as AiAssetItem[];
  const foundKeys = new Set(found.map((item) => item.asset_key));

  return {
    found,
    missing: normalizedKeys.filter((key) => !foundKeys.has(key)),
  };
}

export async function deleteAiAsset(item: AiAssetItem) {
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([item.storage_path]);

  if (storageError) throw storageError;

  const { error } = await supabase.from('ai_assets').delete().eq('id', item.id);

  if (error) throw error;

  return true;
}