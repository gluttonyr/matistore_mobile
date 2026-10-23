import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import MatiLogo from '@/components/ui/MatiLogo';
import { Colors } from '@/constants/colors';

const POINTS = ['Dépôts et retraits sécurisés', 'Discussion directe avec l’équipe', 'Événements et forum de la communauté'];

// Website on a computer: left half of the sign-in / sign-up pages.
export default function WebBrandPanel() {
  return (
    <View style={styles.panel}>
      <LinearGradient
        colors={['rgba(125,255,42,0.10)', Colors.darkBg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.circle} />
      <MatiLogo size={220} showText />
      <Text style={styles.tagline}>Le store sécurisé et rapide !</Text>
      <View style={styles.points}>
        {POINTS.map((p) => (
          <View key={p} style={styles.point}>
            <View style={styles.dot} />
            <Text style={styles.pointText}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  circle: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(125,255,42,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.08)',
  },
  tagline: { color: Colors.primaryGreen, fontSize: 20, fontWeight: '600', marginTop: 12, marginBottom: 36 },
  points: { gap: 16 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primaryGreen },
  pointText: { color: Colors.white, fontSize: 17 },
});
