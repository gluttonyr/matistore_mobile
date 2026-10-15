import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SEEN_NOTIFICATION_KEY = 'app_notifications_last_seen_at:';

export async function getLastSeenNotificationAt(userId: string): Promise<number> {
  const value = await AsyncStorage.getItem(`${LAST_SEEN_NOTIFICATION_KEY}${userId}`);
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function markNotificationsSeen(userId: string, createdAtValues: string[]): Promise<void> {
  const latestTimestamp = createdAtValues.reduce((latest, value) => {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);
  if (latestTimestamp > 0) {
    await AsyncStorage.setItem(`${LAST_SEEN_NOTIFICATION_KEY}${userId}`, new Date(latestTimestamp).toISOString());
  }
}
