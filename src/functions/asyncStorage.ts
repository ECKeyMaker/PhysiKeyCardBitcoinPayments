/**
 * Saved accounts: a name → wallet address list kept in AsyncStorage. Addresses are public,
 * so nothing secret is stored here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedAccount {
  name: string;
  address: string;
}

// Older builds stored a "default" key here; it isn't an account.
const IGNORED_KEYS = new Set(['default']);

export const saveAccount = async (name: string, address: string): Promise<void> => {
  await AsyncStorage.setItem(name.trim(), JSON.stringify(address));
};

export const getSavedAccounts = async (): Promise<SavedAccount[]> => {
  const keys = (await AsyncStorage.getAllKeys()).filter(key => !IGNORED_KEYS.has(key));
  const values = await AsyncStorage.getMany(keys);
  return keys
    .map(name => {
      try {
        const address = JSON.parse(values[name] ?? 'null');
        return typeof address === 'string' ? { name, address } : null;
      } catch {
        return null;
      }
    })
    .filter((account): account is SavedAccount => account !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const removeSavedAccount = (name: string): Promise<void> => AsyncStorage.removeItem(name);
