import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder as useExpoAudioRecorder,
} from 'expo-audio';

export type AudioHook = {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<{ uri: string; blob: Blob } | null>;
  cancelRecording: () => Promise<void>;
  isAvailable: boolean;
};

export function useAudioRecorder(): AudioHook {
  // Le recorder DOIT être créé via le hook, pas via une fonction dynamique.
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission refusée', 'Autorisation micro requise.');
        return false;
      }

      // setAudioModeAsync est un export direct du module, pas une méthode de AudioModule.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
      return true;
    } catch (e) {
      console.error('Recording start failed:', e);
      return false;
    }
  };

  const stopRecording = async (): Promise<{ uri: string; blob: Blob } | null> => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await recorder.stop();
      const uri = recorder.uri;
      setIsRecording(false);
      setRecordingDuration(0);
      if (!uri) return null;
      const response = await fetch(uri);
      const blob = await response.blob();
      return { uri, blob };
    } catch (e) {
      console.error('Recording stop failed:', e);
      setIsRecording(false);
      return null;
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await recorder.stop();
    } catch {
      // déjà arrêté ou jamais démarré
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  return {
    isAvailable: true,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}