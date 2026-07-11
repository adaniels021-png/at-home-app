// lib/worksheetArtLibrary.ts

import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export type WorksheetArtItem = {
  id: string;
  image_key: string;
  title: string;
  category: string | null;
  tags: string[] | null;
  image_url: string;
  storage_path: string;
  created_at?: string;
  updated_at?: string;
};

export type UploadWorksheetArtInput = {
  localUri: string;
  imageKey: string;
  title: string;
  category?: string;
  tags?: string[];
};

export type UploadFullPageWorksheetArtInput = {
  localUri: string;
  worksheetQueueId: string;
  title: string;
  category?: string | null;
};

export type WorksheetQueueArtworkUpdate = {
  id: string;
  title: string;
  category: string | null;
  full_page_art_url: string | null;
  full_page_art_storage_path: string | null;
  updated_at?: string | null;
};

const BUCKET_NAME = 'worksheet-art';

export function normalizeWorksheetArtKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeKey(value: string) {
  return normalizeWorksheetArtKey(value);
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

async function readLocalFileAsArrayBuffer(localUri: string) {
  if (!localUri) {
    throw new Error('Image file is required.');
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return decode(base64);
}

async function uploadImageToWorksheetBucket(input: {
  localUri: string;
  storagePath: string;
  contentType: string;
}) {
  const fileBody = await readLocalFileAsArrayBuffer(input.localUri);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(input.storagePath, fileBody, {
      contentType: input.contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(input.storagePath);

  return publicData.publicUrl;
}

export async function uploadWorksheetArt(input: UploadWorksheetArtInput) {
  const imageKey = normalizeKey(input.imageKey);

  if (!imageKey) {
    throw new Error('Image key is required.');
  }

  if (!input.localUri) {
    throw new Error('Image file is required.');
  }

  const extension = getFileExtension(input.localUri);
  const mimeType = getMimeType(extension);
  const storagePath = `${imageKey}.${extension}`;

  const imageUrl = await uploadImageToWorksheetBucket({
    localUri: input.localUri,
    storagePath,
    contentType: mimeType,
  });

  const record = {
    image_key: imageKey,
    title: input.title.trim() || imageKey,
    category: input.category?.trim() || null,
    tags: input.tags || [],
    image_url: imageUrl,
    storage_path: storagePath,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('worksheet_art_library')
    .upsert(record, { onConflict: 'image_key' })
    .select('*')
    .single();

  if (error) throw error;

  return data as WorksheetArtItem;
}

export async function uploadFullPageWorksheetArt(
  input: UploadFullPageWorksheetArtInput
) {
  if (!input.worksheetQueueId) {
    throw new Error('Worksheet queue ID is required.');
  }

  if (!input.localUri) {
    throw new Error('Image file is required.');
  }

  const safeTitle = normalizeKey(input.title || 'worksheet');
  const safeCategory = normalizeKey(input.category || 'worksheet');
  const extension = getFileExtension(input.localUri);
  const mimeType = getMimeType(extension);
  const timestamp = Date.now();
  const storagePath = `full-page/${safeCategory}/${safeTitle}-${input.worksheetQueueId}-${timestamp}.${extension}`;

  const imageUrl = await uploadImageToWorksheetBucket({
    localUri: input.localUri,
    storagePath,
    contentType: mimeType,
  });

  const updatePayload = {
    full_page_art_url: imageUrl,
    full_page_art_storage_path: storagePath,
    status: 'pending',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('worksheet_queue')
    .update(updatePayload)
    .eq('id', input.worksheetQueueId)
    .select(
      'id,title,category,full_page_art_url,full_page_art_storage_path,updated_at'
    )
    .single();

  if (error) throw error;

  return data as WorksheetQueueArtworkUpdate;
}

export async function clearFullPageWorksheetArt(worksheetQueueId: string) {
  if (!worksheetQueueId) {
    throw new Error('Worksheet queue ID is required.');
  }

  const { data: existing, error: readError } = await supabase
    .from('worksheet_queue')
    .select('id,full_page_art_storage_path')
    .eq('id', worksheetQueueId)
    .maybeSingle();

  if (readError) throw readError;

  const storagePath = existing?.full_page_art_storage_path;

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (storageError) throw storageError;
  }

  const { data, error } = await supabase
    .from('worksheet_queue')
    .update({
      full_page_art_url: null,
      full_page_art_storage_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', worksheetQueueId)
    .select(
      'id,title,category,full_page_art_url,full_page_art_storage_path,updated_at'
    )
    .single();

  if (error) throw error;

  return data as WorksheetQueueArtworkUpdate;
}

export async function getWorksheetArtByKey(imageKey: string) {
  const normalizedKey = normalizeKey(imageKey);

  const { data, error } = await supabase
    .from('worksheet_art_library')
    .select('*')
    .eq('image_key', normalizedKey)
    .maybeSingle();

  if (error) throw error;

  return data as WorksheetArtItem | null;
}

export async function listWorksheetArt() {
  const { data, error } = await supabase
    .from('worksheet_art_library')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []) as WorksheetArtItem[];
}

export async function searchWorksheetArt(query: string) {
  const term = query.trim();

  if (!term) return listWorksheetArt();

  const { data, error } = await supabase
    .from('worksheet_art_library')
    .select('*')
    .or(
      `image_key.ilike.%${term}%,title.ilike.%${term}%,category.ilike.%${term}%`
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []) as WorksheetArtItem[];
}

export async function findMissingWorksheetArt(imageKeys: string[]) {
  const normalizedKeys = imageKeys.map(normalizeKey).filter(Boolean);

  if (!normalizedKeys.length) {
    return {
      found: [] as WorksheetArtItem[],
      missing: [] as string[],
    };
  }

  const { data, error } = await supabase
    .from('worksheet_art_library')
    .select('*')
    .in('image_key', normalizedKeys);

  if (error) throw error;

  const found = (data || []) as WorksheetArtItem[];
  const foundKeys = new Set(found.map((item) => item.image_key));

  return {
    found,
    missing: normalizedKeys.filter((key) => !foundKeys.has(key)),
  };
}

export async function deleteWorksheetArt(item: WorksheetArtItem) {
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([item.storage_path]);

  if (storageError) throw storageError;

  const { error } = await supabase
    .from('worksheet_art_library')
    .delete()
    .eq('id', item.id);

  if (error) throw error;

  return true;
}
