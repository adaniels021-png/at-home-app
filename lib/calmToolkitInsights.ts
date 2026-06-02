import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalmToolkitLog = {
  id: string;

  childId?: string;

  toolType:
    | 'quiet-space'
    | 'sensory-reset'
    | 'simple-words'
    | 'breathe-together';

  strategyName?: string;

  trigger?: string;
  toolsUsed?: string[];
  phraseUsed?: string | null;

  beforeLevel?: number | null;
  afterLevel?: number | null;

  helped: boolean;

  createdAt: string;
};

const STORAGE_KEY = 'calm-toolkit-logs';

export async function saveCalmToolkitLog(
  log: Omit<CalmToolkitLog, 'id' | 'createdAt'>
) {
  try {
    const existing = await getCalmToolkitLogs();

    const newLog: CalmToolkitLog = {
  ...log,
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  createdAt: new Date().toISOString(),
};

    const updated = [newLog, ...existing].slice(0, 50);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return newLog;
  } catch (error) {
    console.error('saveCalmToolkitLog error:', error);
    return null;
  }
}

export async function getCalmToolkitLogs(): Promise<CalmToolkitLog[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('getCalmToolkitLogs error:', error);
    return [];
  }
}

export async function getRecentlyHelpfulCalmPlan() {
  const logs = await getCalmToolkitLogs();

  return logs.find((log) => log.helped) || null;
}

export async function getTopCalmToolInsight(childId?: string | null) {
  const logs = await getCalmToolkitLogs();

  const helpfulLogs = logs.filter((log) => {
    if (!log.helped) return false;
    if (childId && log.childId !== childId) return false;
    return true;
  });

  if (!helpfulLogs.length) return null;

  const counts: Record<string, number> = {};

  helpfulLogs.forEach((log) => {
    const key = log.strategyName || log.toolType;
    counts[key] = (counts[key] || 0) + 1;
  });

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  if (!top) return null;

  return {
    name: top[0],
    count: top[1],
  };
}