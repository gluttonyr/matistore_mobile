import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type ExpoUssdDialerNativeModule = {
  dialUssd(ussdCode: string): Promise<void>;
};

const nativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<ExpoUssdDialerNativeModule>('ExpoUssdDialer')
  : null;

/** Opens the Android SIM picker when needed, then asks Telecom to launch USSD. */
export async function dialUssd(ussdCode: string): Promise<void> {
  if (!nativeModule) throw new Error('USSD_UNAVAILABLE');
  return nativeModule.dialUssd(ussdCode);
}
