import AsyncStorage from '@react-native-async-storage/async-storage';

export type ParentJournalEntry = {
  id: string;
  text: string;
  promptTitle: string;
  promptText: string;
  moods: string[];
  stressLevel: number | null;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'aba_at_home_parent_journal_entries';

export async function getParentJournalEntries(): Promise<ParentJournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.log('Error loading journal entries:', error);
    return [];
  }
}

export async function upsertParentJournalEntry(entry: {
  id?: string | null;
  text: string;
  promptTitle: string;
  promptText: string;
  moods: string[];
  stressLevel: number | null;
}): Promise<ParentJournalEntry[]> {
  const current = await getParentJournalEntries();
  const now = new Date().toISOString();

  const existing = entry.id
    ? current.find((item) => item.id === entry.id)
    : null;

  const savedEntry: ParentJournalEntry = {
    id: existing?.id || `journal-${Date.now()}`,
    text: entry.text.trim(),
    promptTitle: entry.promptTitle,
    promptText: entry.promptText,
    moods: entry.moods,
    stressLevel: entry.stressLevel,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const updated = [
    savedEntry,
    ...current.filter((item) => item.id !== savedEntry.id),
  ];

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  return updated;
}

export async function deleteParentJournalEntry(
  id: string
): Promise<ParentJournalEntry[]> {
  const current = await getParentJournalEntries();
  const updated = current.filter((entry) => entry.id !== id);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  return updated;
}