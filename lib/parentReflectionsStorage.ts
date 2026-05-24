import AsyncStorage from '@react-native-async-storage/async-storage';

export type ParentReflectionType =
  | 'journal'
  | 'emotional-reset'
  | 'saved-reminder';

export type SavedParentReflection = {
  id: string;
  type: ParentReflectionType;
  title: string;
  subtitle: string;
  body?: string;
  mood?: string;
  stressLevel?: number | null;
  completedSteps?: string[];
  icon: string;
  color: string;
  bg: string;
  createdAt: string;
};

const STORAGE_KEY = 'aba_at_home_parent_reflections';

export async function getSavedParentReflections(): Promise<
  SavedParentReflection[]
> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch (error) {
    console.log('Error loading parent reflections:', error);
    return [];
  }
}

export async function saveParentReflection(
  reflection: Omit<SavedParentReflection, 'id' | 'createdAt'>
): Promise<SavedParentReflection[]> {
  try {
    const current = await getSavedParentReflections();

    const newReflection: SavedParentReflection = {
      ...reflection,
      id: `${reflection.type}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updated = [newReflection, ...current].slice(0, 30);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return updated;
  } catch (error) {
    console.log('Error saving parent reflection:', error);
    return getSavedParentReflections();
  }
}

export async function getParentReflectionById(
  id: string
): Promise<SavedParentReflection | null> {
  try {
    const reflections = await getSavedParentReflections();

    return reflections.find((item) => item.id === id) || null;
  } catch (error) {
    console.log('Error loading reflection detail:', error);
    return null;
  }
}

export async function deleteParentReflection(
  id: string
): Promise<SavedParentReflection[]> {
  try {
    const current = await getSavedParentReflections();

    const updated = current.filter((item) => item.id !== id);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return updated;
  } catch (error) {
    console.log('Error deleting parent reflection:', error);
    return getSavedParentReflections();
  }
}