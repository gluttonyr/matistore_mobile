import * as SecureStore from 'expo-secure-store';

const FORUM_LAST_SEEN_KEY = 'forum_last_seen_at';

export const forumStorage = {
  async getLastSeenAt(): Promise<string | null> {
    return await SecureStore.getItemAsync(FORUM_LAST_SEEN_KEY);
  },

  async setLastSeenAt(iso: string): Promise<void> {
    await SecureStore.setItemAsync(FORUM_LAST_SEEN_KEY, iso);
  },
};
