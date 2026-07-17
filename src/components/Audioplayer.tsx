import { Colors } from '@/constants/colors';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  uri: string;
  isMe: boolean;
};

export function AudioPlayer({ uri, isMe }: Props) {
  const playerRef = useRef<any>(null);
  const AudioModuleRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    try {
      AudioModuleRef.current = require('expo-audio');
      setAvailable(true);
    } catch { setAvailable(false); }
    return () => { playerRef.current?.remove?.(); };
  }, []);

  const toggle = async () => {
    if (!AudioModuleRef.current) return;
    try {
      const { createAudioPlayer } = AudioModuleRef.current;
      if (!playerRef.current) {
        const player = createAudioPlayer({ uri });
        player.addListener('playbackStatusUpdate', (status: any) => {
          if (status.isLoaded) {
            setPosition(status.currentTime ?? 0);
            setDuration(status.duration ?? 0);
            if (status.didJustFinish) {
              setPlaying(false);
              setPosition(0);
              playerRef.current = null;
            }
          }
        });
        player.play();
        playerRef.current = player;
        setPlaying(true);
      } else if (playing) {
        playerRef.current.pause();
        setPlaying(false);
      } else {
        playerRef.current.play();
        setPlaying(true);
      }
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  const progress = duration > 0 ? position / duration : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const fgColor = isMe ? '#000' : Colors.white;
  const trackColor = isMe ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
  const fillColor = isMe ? 'rgba(0,0,0,0.5)' : Colors.primaryGreen;

  if (!available) {
    return <Text style={{ color: fgColor, fontSize: 12 }}>🎵 Audio — {uri.split('/').pop()}</Text>;
  }

  return (
    <TouchableOpacity style={st.wrap} onPress={toggle} activeOpacity={0.8}>
      <View style={[st.btn, { backgroundColor: isMe ? 'rgba(0,0,0,0.2)' : Colors.primaryGreen }]}>
        <Text style={{ color: '#000', fontSize: 14 }}>{playing ? '⏸' : '▶'}</Text>
      </View>
      <View style={st.track}>
        <View style={[st.trackBg, { backgroundColor: trackColor }]}>
          <View style={[st.trackFill, { width: `${progress * 100}%`, backgroundColor: fillColor }]} />
        </View>
        <Text style={[st.time, { color: fgColor }]}>{fmt(position)} / {fmt(duration)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 170 },
  btn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, gap: 4 },
  trackBg: { height: 3, borderRadius: 2 },
  trackFill: { height: 3, borderRadius: 2 },
  time: { fontSize: 10 },
});