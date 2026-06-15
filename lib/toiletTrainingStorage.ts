import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@aba_toilet_training_entries';

export type PottyResult =
  | 'success'
  | 'attempt'
  | 'accident';

export type PottyEntry = {
  id: string;
  childId: string;
  timestamp: string;
  result: PottyResult;
  notes?: string;
};

async function readEntries(): Promise<PottyEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading toilet training entries:', error);
    return [];
  }
}

async function saveEntries(entries: PottyEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries)
    );
  } catch (error) {
    console.error('Error saving toilet training entries:', error);
  }
}

/**
 * Save a potty entry
 */
export async function savePottyEntry(
  entry: PottyEntry
): Promise<void> {
  const entries = await readEntries();

  entries.unshift(entry);

  await saveEntries(entries);
}

/**
 * Get all entries
 */
export async function getPottyEntries(): Promise<PottyEntry[]> {
  const entries = await readEntries();

  return entries.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  );
}

/**
 * Get entries for a specific child
 */
export async function getPottyEntriesForChild(
  childId: string
): Promise<PottyEntry[]> {
  const entries = await readEntries();

  return entries
    .filter((entry) => entry.childId === childId)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    );
}

/**
 * Delete entry
 */
export async function deletePottyEntry(
  entryId: string
): Promise<void> {
  const entries = await readEntries();

  const updated = entries.filter(
    (entry) => entry.id !== entryId
  );

  await saveEntries(updated);
}

/**
 * Clear all potty entries
 */
export async function clearPottyEntries(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Today's entries
 */
export async function getTodaysPottyEntries(
  childId: string
): Promise<PottyEntry[]> {
  const entries = await getPottyEntriesForChild(childId);

  const today = new Date();

  return entries.filter((entry) => {
    const entryDate = new Date(entry.timestamp);

    return (
      entryDate.getFullYear() === today.getFullYear() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getDate() === today.getDate()
    );
  });
}

/**
 * Quick stats for dashboard
 */
export async function getTodaysPottyStats(
  childId: string
) {
  const entries = await getTodaysPottyEntries(childId);

  const successes = entries.filter(
    (e) => e.result === 'success'
  ).length;

  const attempts = entries.filter(
    (e) => e.result === 'attempt'
  ).length;

  const accidents = entries.filter(
    (e) => e.result === 'accident'
  ).length;

  return {
    successes,
    attempts,
    accidents,
    total: entries.length,
  };
}

/**
 * Weekly stats
 */
export async function getWeeklyPottyStats(
  childId: string
) {
  const entries = await getPottyEntriesForChild(childId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(
    sevenDaysAgo.getDate() - 7
  );

  const weeklyEntries = entries.filter(
    (entry) =>
      new Date(entry.timestamp) >= sevenDaysAgo
  );

  const successes = weeklyEntries.filter(
    (e) => e.result === 'success'
  ).length;

  const attempts = weeklyEntries.filter(
    (e) => e.result === 'attempt'
  ).length;

  const accidents = weeklyEntries.filter(
    (e) => e.result === 'accident'
  ).length;

  const total = weeklyEntries.length;

  const successRate =
    total > 0
      ? Math.round(
          (successes / total) * 100
        )
      : 0;

  return {
    successes,
    attempts,
    accidents,
    total,
    successRate,
  };
}

/**
 * Current success streak
 * Counts consecutive days with at least one success.
 */
export async function getPottySuccessStreak(
  childId: string
): Promise<number> {
  const entries = await getPottyEntriesForChild(
    childId
  );

  if (!entries.length) {
    return 0;
  }

  const successDays = new Set(
    entries
      .filter(
        (entry) => entry.result === 'success'
      )
      .map((entry) => {
        const date = new Date(entry.timestamp);

        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      })
  );

  let streak = 0;

  const currentDate = new Date();

  while (true) {
    const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;

    if (successDays.has(key)) {
      streak++;
      currentDate.setDate(
        currentDate.getDate() - 1
      );
    } else {
      break;
    }
  }

  return streak;
}

export async function deletePottyEntryForChild(
  childId: string,
  entryId: string
): Promise<void> {
  const entries = await readEntries();

  const updated = entries.filter(
    (entry) => !(entry.childId === childId && entry.id === entryId)
  );

  await saveEntries(updated);
}

const READINESS_KEY = '@aba_toilet_readiness_results';

export type PottyReadinessLevel =
  | 'not_ready'
  | 'building_skills'
  | 'ready_to_start'
  | 'ready_for_routine';

export type PottyReadinessResult = {
  childId: string;
  score: number;
  level: PottyReadinessLevel;
  answers: Record<string, boolean>;
  updatedAt: string;
};

async function readReadinessResults(): Promise<PottyReadinessResult[]> {
  try {
    const stored = await AsyncStorage.getItem(READINESS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading potty readiness:', error);
    return [];
  }
}

async function saveReadinessResults(results: PottyReadinessResult[]) {
  try {
    await AsyncStorage.setItem(READINESS_KEY, JSON.stringify(results));
  } catch (error) {
    console.error('Error saving potty readiness:', error);
  }
}

export async function savePottyReadinessResult(
  result: PottyReadinessResult
): Promise<void> {
  const results = await readReadinessResults();

  const updated = [
    result,
    ...results.filter((item) => item.childId !== result.childId),
  ];

  await saveReadinessResults(updated);
}

export async function getPottyReadinessResult(
  childId: string
): Promise<PottyReadinessResult | null> {
  const results = await readReadinessResults();

  return results.find((item) => item.childId === childId) || null;
}