export type PushDevicePlatform = 'android' | 'ios';

export interface PushDevice {
  id?: string;
  userId?: string;
  token: string;
  platform: PushDevicePlatform;
  deviceId?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePushDeviceDto {
  userId?: string;
  token: string;
  platform: PushDevicePlatform;
  deviceId?: string;
  active?: boolean;
}

export interface UpdatePushDeviceDto {
  token?: string;
  platform?: PushDevicePlatform;
  deviceId?: string;
  active?: boolean;
}
