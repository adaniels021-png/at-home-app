import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const key = (childId: string, name: string) =>
  `communication:${childId}:${name}`;

export type OfflinePecsUsageLog = {
  child_id: string;
  card_id?: string | null;
  phrase?: string | null;
  action: 'card_tap' | 'phrase_speak' | 'favorite_toggle';
  created_at: string;
};

export async function saveOfflineCards(childId: string, cards: any[]) {
  await AsyncStorage.setItem(key(childId, 'cards'), JSON.stringify(cards || []));
}

export async function loadOfflineCards(childId: string) {
  try {
    const raw = await AsyncStorage.getItem(key(childId, 'cards'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveOfflineBoards(childId: string, boards: any[]) {
  await AsyncStorage.setItem(key(childId, 'boards'), JSON.stringify(boards || []));
}

export async function loadOfflineBoards(childId: string) {
  try {
    const raw = await AsyncStorage.getItem(key(childId, 'boards'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveOfflineFavorites(childId: string, ids: string[]) {
  await AsyncStorage.setItem(key(childId, 'favorites'), JSON.stringify(ids || []));
}

export async function loadOfflineFavorites(childId: string) {
  try {
    const raw = await AsyncStorage.getItem(key(childId, 'favorites'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveOfflineUsage(
  childId: string,
  usage: Record<string, number>
) {
  await AsyncStorage.setItem(key(childId, 'usage'), JSON.stringify(usage || {}));
}

export async function loadOfflineUsage(childId: string) {
  try {
    const raw = await AsyncStorage.getItem(key(childId, 'usage'));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function queuePecsUsage(
  childId: string,
  log: OfflinePecsUsageLog
) {
  const raw = await AsyncStorage.getItem(key(childId, 'usageQueue'));
  const queue = raw ? JSON.parse(raw) : [];

  queue.push({
    ...log,
    child_id: log.child_id || childId,
    created_at: log.created_at || new Date().toISOString(),
  });

  await AsyncStorage.setItem(key(childId, 'usageQueue'), JSON.stringify(queue));
}

export async function loadPecsUsageQueue(childId: string) {
  try {
    const raw = await AsyncStorage.getItem(key(childId, 'usageQueue'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function flushPecsUsageQueue(childId: string) {
  const queue = await loadPecsUsageQueue(childId);

  if (!queue.length) return { flushed: 0 };

  const { error } = await supabase.from('pecs_card_usage').insert(queue);

  if (!error) {
    await AsyncStorage.removeItem(key(childId, 'usageQueue'));
    return { flushed: queue.length };
  }

  console.error('flushPecsUsageQueue error:', error);
  return { flushed: 0, error };
}