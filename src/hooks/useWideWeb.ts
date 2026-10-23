import { Platform, useWindowDimensions } from 'react-native';

// True only on the website on a computer-sized screen; always false in the mobile app.
export function useWideWeb() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 1024;
}
