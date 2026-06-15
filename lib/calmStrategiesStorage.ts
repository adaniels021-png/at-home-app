import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalmStrategyType =
  | 'quiet-space'
  | 'sensory-reset'
  | 'simple-words'
  | 'breathe-together'
  | 'emotional-reset';

export type SavedCalmStrategy = {
  id: string;
  type: CalmStrategyType;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bg: string;
  createdAt: string;
};

const STORAGE_KEY = 'aba_at_home_saved_calm_strategies';

export async function getSavedCalmStrategies(): Promise<
  SavedCalmStrategy[]
> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.log('Error loading saved calm strategies:', error);
    return [];
  }
}

export async function saveCalmStrategy(
  strategy: Omit<SavedCalmStrategy, 'id' | 'createdAt'>
): Promise<SavedCalmStrategy[]> {
  try {
    if (strategy.type === 'simple-words') {
      return getSavedCalmStrategies();
    }

    const currentStrategies = await getSavedCalmStrategies();

    const newStrategy: SavedCalmStrategy = {
      ...strategy,
      id: `${strategy.type}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // Remove duplicate entries
    const filteredStrategies = currentStrategies.filter(
      (item) =>
        !(
          item.type === newStrategy.type &&
          item.title === newStrategy.title &&
          item.subtitle === newStrategy.subtitle
        )
    );

    // Add newest first
    const updatedStrategies = [
      newStrategy,
      ...filteredStrategies,
    ].slice(0, 20);

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedStrategies)
    );

    return updatedStrategies;
  } catch (error) {
    console.log('Error saving calm strategy:', error);

    return getSavedCalmStrategies();
  }
}

export async function deleteCalmStrategy(
  id: string
): Promise<SavedCalmStrategy[]> {
  try {
    const currentStrategies = await getSavedCalmStrategies();

    const updatedStrategies = currentStrategies.filter(
      (item) => item.id !== id
    );

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedStrategies)
    );

    return updatedStrategies;
  } catch (error) {
    console.log('Error deleting calm strategy:', error);

    return getSavedCalmStrategies();
  }
}

export async function clearSavedCalmStrategies(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.log('Error clearing saved calm strategies:', error);
  }
}