import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

export type AudioHook = {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<{ uri: string; blob: Blob } | null>;
  cancelRecording: () => Promise<void>;
  isAvailable: boolean;
};

export function useAudioRecorder(): AudioHook {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorderRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const AudioModuleRef = useRef<any>(null);

  useEffect(() => {
    try {
      const expoAudio = require('expo-audio');
      AudioModuleRef.current = expoAudio;
      setIsAvailable(true);
    } catch {
      setIsAvailable(false);
    }
  }, []);

  const startRecording = async (): Promise<boolean> => {
    if (!AudioModuleRef.current) return false;
    try {
      const { AudioModule, RecordingPresets } = AudioModuleRef.current;
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission refusée', 'Autorisation micro requise.');
        return false;
      }
      await AudioModule.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recorder = AudioModuleRef.current.createAudioRecorder(RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      recorderRef.current = recorder;
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
      if (!recorderRef.current) return null;
      if (timerRef.current) clearInterval(timerRef.current);
      await recorderRef.current.stop();
      const uri = recorderRef.current.uri;
      recorderRef.current = null;
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
    if (recorderRef.current) {
      try { await recorderRef.current.stop(); } catch { }
    }
    recorderRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
  };

  return { isAvailable, isRecording, recordingDuration, startRecording, stopRecording, cancelRecording };
}