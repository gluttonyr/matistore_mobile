// storage/versionStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMIND_LATER_KEY = 'version_update_remind_later_until';
const REMIND_LATER_DELAY_MS = 24 * 60 * 60 * 1000; // 24h

export const versionStorage = {
  async getRemindLaterUntil(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(REMIND_LATER_KEY);
    return raw ? parseInt(raw, 10) : null;
  },
  async setRemindLater(): Promise<void> {
    await AsyncStorage.setItem(REMIND_LATER_KEY, String(Date.now() + REMIND_LATER_DELAY_MS));
  },
  async clearRemindLater(): Promise<void> {
    await AsyncStorage.removeItem(REMIND_LATER_KEY);
  },
};