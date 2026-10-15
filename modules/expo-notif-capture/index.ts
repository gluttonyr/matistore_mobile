import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type OperatorWatch = {
  packageName: string;
  title: string;
  pattern: string;
  operateurNom: string;
};

interface NotifCaptureNativeModule {
  hasPermission(): boolean;
  isAdminCaptureEnabled(): boolean;
  reportCaptureStatus(ready: boolean, reason?: string): void;
  openSettings(): void;
  configureAdminCapture(apiBaseUrl: string, authToken: string, watchesJson: string, debugEnabled: boolean): void;
  stopCapture(): void;
}

const NativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<NotifCaptureNativeModule & NotifCaptureEvents>('ExpoNotifCapture')
  : null;

export function hasNotificationAccess(): boolean {
  return NativeModule?.hasPermission() ?? false;
}

export function isAdminCaptureEnabled(): boolean {
  return NativeModule?.isAdminCaptureEnabled() ?? false;
}

export function reportCaptureStatus(ready: boolean, reason?: string): void {
  NativeModule?.reportCaptureStatus(ready, reason);
}

export function openNotificationSettings(): void {
  NativeModule?.openSettings();
}

export function configureAdminCapture(apiBaseUrl: string, authToken: string, watches: OperatorWatch[]): void {
  NativeModule?.configureAdminCapture(apiBaseUrl, authToken, JSON.stringify(watches), __DEV__);
}

export function stopCapture(): void {
  NativeModule?.stopCapture();
}
