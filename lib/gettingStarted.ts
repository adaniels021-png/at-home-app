import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

const STORAGE_KEY_PREFIX = 'aba-at-home:getting-started-completed:v1';

async function getStorageKey() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return `${STORAGE_KEY_PREFIX}:${user?.id || 'anonymous'}`;
}

export async function hasCompletedGettingStarted() {
  const key = await getStorageKey();
  return (await AsyncStorage.getItem(key)) === 'true';
}

export async function completeGettingStarted() {
  const key = await getStorageKey();
  await AsyncStorage.setItem(key, 'true');
}
