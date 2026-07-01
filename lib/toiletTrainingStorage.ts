import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@aba_toilet_training_entries';
const READINESS_KEY = '@aba_toilet_readiness_results';
const SCHEDULE_KEY = '@aba_toilet_training_schedule';

export type PottyResult = 'success' | 'attempt' | 'accident';

export type PottyOutput = 'pee' | 'poop' | 'both' | 'none' | 'unsure';

export type PottySupportNeed =
  | 'refusal'
  | 'fear'
  | 'sat_but_did_not_go'
  | 'accident_after_sitting'
  | 'does_not_communicate_need'
  | 'transition_difficulty'
  | 'sensory_discomfort'
  | 'constipation_concern'
  | 'other';

export type PottyPromptLevel =
  | 'independent'
  | 'verbal_prompt'
  | 'visual_prompt'
  | 'physical_help'
  | 'full_support';

export type PottyEntry = {
  id: string;
  childId: string;
  timestamp: string;
  result: PottyResult;
  output?: PottyOutput;
  supportNeeds?: PottySupportNeed[];
  promptLevel?: PottyPromptLevel;
  satMinutes?: number;
  notes?: string;
};

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

export type PottyInsight = {
  title: string;
  message: string;
  nextStep: string;
  type: 'comfort' | 'timing' | 'communication' | 'success' | 'support';
};

export type PottyScheduleSettings = {
  childId: string;
  selectedMinutes: number;
  lastPottyTimestamp: string;
  updatedAt: string;
};

async function readEntries(): Promise<PottyEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading toilet training entries:', error);
    return [];
  }
}

async function saveEntries(entries: PottyEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving toilet training entries:', error);
  }
}

export async function savePottyEntry(entry: PottyEntry): Promise<void> {
  const entries = await readEntries();
  entries.unshift(entry);
  await saveEntries(entries);
}

export async function getPottyEntries(): Promise<PottyEntry[]> {
  const entries = await readEntries();

  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function getPottyEntriesForChild(childId: string): Promise<PottyEntry[]> {
  const entries = await readEntries();

  return entries
    .filter((entry) => entry.childId === childId)
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export async function deletePottyEntry(entryId: string): Promise<void> {
  const entries = await readEntries();
  await saveEntries(entries.filter((entry) => entry.id !== entryId));
}

export async function deletePottyEntryForChild(
  childId: string,
  entryId: string
): Promise<void> {
  const entries = await readEntries();

  await saveEntries(
    entries.filter((entry) => !(entry.childId === childId && entry.id === entryId))
  );
}

export async function clearPottyEntries(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function updatePottyEntryForChild(
  childId: string,
  updatedEntry: PottyEntry
): Promise<void> {
  const entries = await readEntries();

  const updated = entries.map((entry) =>
    entry.childId === childId && entry.id === updatedEntry.id
      ? updatedEntry
      : entry
  );

  await saveEntries(updated);
}

export async function getTodaysPottyEntries(childId: string): Promise<PottyEntry[]> {
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

export async function getTodaysPottyStats(childId: string) {
  const entries = await getTodaysPottyEntries(childId);

  return {
    successes: entries.filter((e) => e.result === 'success').length,
    attempts: entries.filter((e) => e.result === 'attempt').length,
    accidents: entries.filter((e) => e.result === 'accident').length,
    total: entries.length,
  };
}

export async function getWeeklyPottyStats(childId: string) {
  const entries = await getPottyEntriesForChild(childId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weeklyEntries = entries.filter(
    (entry) => new Date(entry.timestamp) >= sevenDaysAgo
  );

  const successes = weeklyEntries.filter((e) => e.result === 'success').length;
  const attempts = weeklyEntries.filter((e) => e.result === 'attempt').length;
  const accidents = weeklyEntries.filter((e) => e.result === 'accident').length;
  const total = weeklyEntries.length;

  return {
    successes,
    attempts,
    accidents,
    total,
    successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
  };
}

export async function getPottySuccessStreak(childId: string): Promise<number> {
  const entries = await getPottyEntriesForChild(childId);

  const successDays = new Set(
    entries
      .filter((entry) => entry.result === 'success')
      .map((entry) => {
        const date = new Date(entry.timestamp);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      })
  );

  let streak = 0;
  const currentDate = new Date();

  while (true) {
    const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;

    if (!successDays.has(key)) break;

    streak += 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

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

  await saveReadinessResults([
    result,
    ...results.filter((item) => item.childId !== result.childId),
  ]);
}

export async function getPottyReadinessResult(
  childId: string
): Promise<PottyReadinessResult | null> {
  const results = await readReadinessResults();
  return results.find((item) => item.childId === childId) || null;
}

export async function getPottyCoachInsights(childId: string): Promise<PottyInsight[]> {
  const today = await getTodaysPottyEntries(childId);
  const allEntries = await getPottyEntriesForChild(childId);
  const readiness = await getPottyReadinessResult(childId);

  const insights: PottyInsight[] = [];

  const todayAccidents = today.filter((entry) => entry.result === 'accident');
  const todayAttempts = today.filter((entry) => entry.result === 'attempt');
  const todaySuccesses = today.filter((entry) => entry.result === 'success');

  const refusalCount = allEntries.filter((entry) =>
    entry.supportNeeds?.includes('refusal')
  ).length;

  const communicationCount = allEntries.filter((entry) =>
    entry.supportNeeds?.includes('does_not_communicate_need')
  ).length;

  if (!readiness) {
    insights.push({
      title: 'Start with readiness',
      message:
        'Before focusing on accidents or success, find your child’s current potty starting point.',
      nextStep: 'Complete the readiness check first.',
      type: 'support',
    });
  }

  if (readiness?.level === 'not_ready') {
    insights.push({
      title: 'Comfort comes first',
      message:
        'Your child may need more bathroom comfort before a full potty routine.',
      nextStep:
        'Practice short bathroom visits with no pressure to pee or poop.',
      type: 'comfort',
    });
  }

  if (todayAccidents.length >= 2) {
    insights.push({
      title: 'Accidents may show timing needs',
      message:
        'Multiple accidents today may mean your child needs scheduled potty sits before the accident usually happens.',
      nextStep:
        'Try a calm potty sit every 60–90 minutes tomorrow and after meals.',
      type: 'timing',
    });
  }

  if (todayAttempts.length > todaySuccesses.length && todayAttempts.length >= 2) {
    insights.push({
      title: 'Sitting is still progress',
      message:
        'Your child is practicing the routine even if they are not going yet.',
      nextStep:
        'Keep sits short, calm, and predictable. End with praise for trying.',
      type: 'success',
    });
  }

  if (refusalCount >= 2) {
    insights.push({
      title: 'Refusal may need a softer approach',
      message:
        'Repeated refusal can mean the potty routine feels too demanding, scary, or uncomfortable.',
      nextStep:
        'Use a first/then board and start with sitting clothed for 10–30 seconds.',
      type: 'comfort',
    });
  }

  if (communicationCount >= 2) {
    insights.push({
      title: 'Add a potty communication tool',
      message:
        'If your child has trouble telling you they need to go, a visual card can reduce frustration.',
      nextStep:
        'Add a “Potty,” “Help,” or “Bathroom” PECS card near the bathroom.',
      type: 'communication',
    });
  }

  if (todaySuccesses.length > 0) {
    insights.push({
      title: 'Build on today’s success',
      message:
        'A success today gives you a clue about what timing, routine, or support worked.',
      nextStep:
        'Look at what happened before the success and repeat that setup tomorrow.',
      type: 'success',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Keep it predictable',
      message:
        'Potty learning works best when the routine is calm, visual, and consistent.',
      nextStep:
        'Pick 2–4 low-pressure potty sits today and celebrate cooperation.',
      type: 'support',
    });
  }

  return insights.slice(0, 4);
}

export async function getBestPottyWindows(childId: string): Promise<string[]> {
  const entries = await getPottyEntriesForChild(childId);

  const successEntries = entries.filter((entry) => entry.result === 'success');

  if (successEntries.length < 2) {
    return ['After waking', 'After meals', 'Before bath', 'Before bedtime'];
  }

  const hourCounts: Record<number, number> = {};

  successEntries.forEach((entry) => {
    const hour = new Date(entry.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  return Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([hour]) => {
      const h = Number(hour);
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `Around ${displayHour}:00 ${ampm}`;
    });
}

async function readPottySchedules(): Promise<PottyScheduleSettings[]> {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading potty schedules:', error);
    return [];
  }
}

async function savePottySchedules(
  schedules: PottyScheduleSettings[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedules));
  } catch (error) {
    console.error('Error saving potty schedules:', error);
  }
}

export async function savePottySchedule(
  schedule: PottyScheduleSettings
): Promise<void> {
  const schedules = await readPottySchedules();

  const updated = [
    schedule,
    ...schedules.filter((item) => item.childId !== schedule.childId),
  ];

  await savePottySchedules(updated);
}

export async function getSavedPottySchedule(
  childId: string
): Promise<PottyScheduleSettings | null> {
  const schedules = await readPottySchedules();

  return schedules.find((item) => item.childId === childId) || null;
}