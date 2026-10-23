// Web: expo-secure-store has no browser implementation of these calls, so values live in localStorage
// (same API as the three functions the app uses). shortcut: not encrypted, acceptable for a session token in a browser.
export async function getItemAsync(key: string): Promise<string | null> {
  return globalThis.localStorage?.getItem(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  globalThis.localStorage?.setItem(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  globalThis.localStorage?.removeItem(key);
}
