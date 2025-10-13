import { useState, useEffect, useCallback } from 'react';
import { Store } from '@tauri-apps/plugin-store';

let storeInstance: Store | null = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await Store.load('flad-store.json');
  }
  return storeInstance;
}

export function useTauriStore<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const store = await getStore();
        const stored = await store.get<T>(key);
        if (stored !== null && stored !== undefined) {
          setValue(stored);
        }
      } catch (error) {
        console.error(`Error loading ${key}:`, error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [key]);

  const updateValue = useCallback(async (newValue: T) => {
    try {
      const store = await getStore();
      await store.set(key, newValue);
      await store.save();
      setValue(newValue);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  }, [key]);

  return [value, updateValue, isLoading] as const;
}

export async function clearStore() {
  try {
    const store = await getStore();
    await store.clear();
    await store.save();
  } catch (error) {
    console.error('Error clearing store:', error);
  }
}
