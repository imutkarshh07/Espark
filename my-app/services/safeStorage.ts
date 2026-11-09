import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Resilient cross-platform storage adapter.
 * Wraps @react-native-async-storage/async-storage with an in-memory fallback
 * so that missing or failing native modules never crash the application in Expo Go.
 */
const memoryFallback = new Map<string, string>();

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null && val !== undefined) {
        return val;
      }
    } catch (e) {
      console.warn('[SafeStorage] AsyncStorage getItem fallback to memory:', e);
    }
    return memoryFallback.get(key) ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('[SafeStorage] AsyncStorage setItem fallback to memory:', e);
    }
    memoryFallback.set(key, value);
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('[SafeStorage] AsyncStorage removeItem fallback to memory:', e);
    }
    memoryFallback.delete(key);
  },
};
