import { Colors } from '@/constants/colors';
import { Pause, Play } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  uri: string;
  isMe: boolean;
};

// ────────────────────────────────────────────────────────────
// Gestionnaire global : garantit qu'un seul audio joue à la fois.
// ────────────────────────────────────────────────────────────
let activePauseFn: (() => void) | null = null;

function registerAsActivePlayer(pauseFn: () => void) {
  if (activePauseFn && activePauseFn !== pauseFn) {
    activePauseFn();
  }
  activePauseFn = pauseFn;
}

function unregisterIfActive(pauseFn: () => void) {
  if (activePauseFn === pauseFn) {
    activePauseFn = null;
  }
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function buildWaveform(uri: string, barCount: number): number[] {
  const seed = hashSeed(uri);
  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const n = Math.sin(seed + i * 12.9898) * 43758.5453;
    const frac = n - Math.floor(n);
    bars.push(0.25 + frac * 0.75);
  }
  return bars;
}

const BAR_COUNT = 24;

export function AudioPlayer({ uri, isMe }: Props) {
  const playerRef = useRef<any>(null);
  const AudioModuleRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [available, setAvailable] = useState(false);
  const [ready, setReady] = useState(false); // métadonnées (durée) chargées

  const waveform = useMemo(() => buildWaveform(uri, BAR_COUNT), [uri]);

  const playingRef = useRef(false);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const pauseRef = useRef(() => {
    if (playerRef.current && playingRef.current) {
      playerRef.current.pause();
      setPlaying(false);
    }
  });

  // ── Création du player DÈS LE MONTAGE, sans le lancer ──
  // Le but : récupérer la durée réelle du fichier (via le premier
  // statut "isLoaded") pour l'afficher avant même la première lecture,
  // au lieu d'attendre que l'utilisateur appuie sur play.
  useEffect(() => {
    let AudioModule: any;
    try {
      AudioModule = require('expo-audio');
      setAvailable(true);
    } catch {
      setAvailable(false);
      return;
    }
    AudioModuleRef.current = AudioModule;

    try {
      const { createAudioPlayer } = AudioModule;
      const player = createAudioPlayer({ uri });
      player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.isLoaded) {
          setDuration(status.duration ?? 0);
          setReady(true);
          // On ne met à jour la position en direct que si c'est bien
          // le lecteur actif (sinon on écraserait un position=0 pendant
          // qu'un autre lecteur joue ailleurs — ici ça reste sans danger
          // car chaque instance a son propre player).
          setPosition(status.currentTime ?? 0);
          if (status.didJustFinish) {
            setPlaying(false);
            setPosition(0);
            unregisterIfActive(pauseRef.current);
          }
        }
      });
      playerRef.current = player;
    } catch (e) {
      console.error('Audio load error:', e);
    }

    return () => {
      unregisterIfActive(pauseRef.current);
      playerRef.current?.remove?.();
      playerRef.current = null;
    };
  }, [uri]);

  const toggle = async () => {
    if (!AudioModuleRef.current || !playerRef.current) return;
    try {
      if (playing) {
        playerRef.current.pause();
        setPlaying(false);
        unregisterIfActive(pauseRef.current);
      } else {
        registerAsActivePlayer(pauseRef.current);
        // Si le morceau était arrivé à la fin, on repart du début.
        if (duration > 0 && position >= duration) {
          playerRef.current.seekTo?.(0);
          setPosition(0);
        }
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
  const trackColor = isMe ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';
  const fillColor = isMe ? 'rgba(0,0,0,0.6)' : Colors.primaryGreen;
  const btnBg = isMe ? 'rgba(0,0,0,0.2)' : Colors.primaryGreen;

  if (!available) {
    return <Text style={{ color: fgColor, fontSize: 12 }}>🎵 Audio — {uri.split('/').pop()}</Text>;
  }

  const filledBars = Math.round(progress * BAR_COUNT);
  // Avant la première lecture : on affiche la durée totale (pas 0:00,
  // sauf le temps que les métadonnées se chargent).
  const displayTime = playing || position > 0 ? position : duration;

  return (
    <TouchableOpacity style={st.wrap} onPress={toggle} activeOpacity={0.8}>
      <View style={[st.btn, { backgroundColor: btnBg }]}>
        {playing ? (
          <Pause color="#000" size={14} fill="#000" />
        ) : (
          <Play color="#000" size={14} fill="#000" style={{ marginLeft: 1 }} />
        )}
      </View>
      <View style={st.track}>
        <View style={st.waveform}>
          {waveform.map((h, i) => (
            <View
              key={i}
              style={[
                st.waveBar,
                {
                  height: `${h * 100}%`,
                  backgroundColor: i < filledBars ? fillColor : trackColor,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[st.time, { color: fgColor }]}>
          {ready ? fmt(displayTime) : '--:--'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180 },
  btn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, gap: 4 },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    gap: 2,
  },
  waveBar: {
    flex: 1,
    minHeight: 2,
    borderRadius: 1.5,
  },
  time: { fontSize: 10 },
});