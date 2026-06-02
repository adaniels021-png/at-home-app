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
const MAX_REFLECTIONS = 30;

// Mutex Lock Queue protects local disk against concurrent write race conditions
let writeQueuePromise: Promise<unknown> = Promise.resolve();

export async function getSavedParentReflections(): Promise<SavedParentReflection[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch (error) {
    console.error('CRITICAL: Error loading parent reflections from disk:', error);
    return [];
  }
}

export async function saveParentReflection(
  reflection: Omit<SavedParentReflection, 'id' | 'createdAt'>
): Promise<SavedParentReflection[]> {
  // Chain operations onto our mutex promise sequentially
  return new Promise((resolve, reject) => {
    writeQueuePromise = writeQueuePromise
      .catch(() => {})
      .then(async () => {
        try {
          const current = await getSavedParentReflections();

          // Deep copy nested structures to isolate memory allocations safely
          const safeCompletedSteps = reflection.completedSteps 
            ? [...reflection.completedSteps] 
            : undefined;

          const newReflection: SavedParentReflection = {
            ...reflection,
            completedSteps: safeCompletedSteps,
            id: `${reflection.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, 
            
            // Hardened unique hash postfix
            createdAt: new Date().toISOString(),
          };

          const updated = [newReflection, ...current].slice(0, MAX_REFLECTIONS);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          
          resolve(updated);
          return updated;
        } catch (error) {
          console.error('CRITICAL: Storage write failed inside saveParentReflection engine:', error);
          // Reject explicitly so client forms don't trick parents into thinking data saved when disk is full
          reject(new Error('Storage limit reached or disk write permission denied.'));
        }
      })
      .catch((err) => {
        console.error('Mutex sync queue recovery exception dropped:', err);
        reject(err);
      });
  });
}

export async function getParentReflectionById(id: string): Promise<SavedParentReflection | null> {
  try {
    const reflections = await getSavedParentReflections();
    return reflections.find((item) => item.id === id) || null;
  } catch (error) {
    console.error('Error loading targeted reflection entry details:', error);
    return null;
  }
}

export async function deleteParentReflection(id: string): Promise<SavedParentReflection[]> {
  return new Promise((resolve, reject) => {
    writeQueuePromise = writeQueuePromise
      .catch(() => {})
      .then(async () => {
        try {
          const current = await getSavedParentReflections();
          const updated = current.filter((item) => item.id !== id);

          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          resolve(updated);
          return updated;
        } catch (error) {
          console.error('CRITICAL: Failed to delete target reflection data segment:', error);
          reject(error);
        }
      });
  });
}