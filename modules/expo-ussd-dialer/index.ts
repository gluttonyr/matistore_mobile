import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/** CALLED: the code was launched. DIALER: the phone app opened with the code, the client taps Call. */
export type UssdDialResult = 'CALLED' | 'DIALER';

type ExpoUssdDialerNativeModule = {
  dialUssd(ussdCode: string): Promise<UssdDialResult>;
};

const nativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<ExpoUssdDialerNativeModule>('ExpoUssdDialer')
  : null;

/**
 * Android: launches the code when the phone permission is already granted (SIM picker if needed),
 * otherwise opens the dialer with the code. Any native problem falls back to the dialer.
 */
export async function dialUssd(ussdCode: string): Promise<UssdDialResult> {
  if (!nativeModule) throw new Error('USSD_UNAVAILABLE');
  return nativeModule.dialUssd(ussdCode);
}
