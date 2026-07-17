import { Colors } from '@/constants/colors';
import { WifiOff } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  message?: string;
  onRetry: () => void;
  /** Remplit l'espace disponible (page dédiée : liste de chats/forum/events). */
  fullscreen?: boolean;
};

/**
 * État "impossible de contacter le serveur" — à afficher à la place d'un
 * spinner qui tourne indéfiniment ou d'un faux état "aucune donnée" quand le
 * problème est en réalité une erreur réseau/serveur.
 */
export function ConnectionErrorState({
  message = 'Impossible de contacter le serveur. Vérifiez votre connexion.',
  onRetry,
  fullscreen = false,
}: Props) {
  return (
    <View style={[styles.box, fullscreen && styles.fullscreen]}>
      <WifiOff color="#f59e0b" size={22} />
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryBtnText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  fullscreen: { flex: 1, justifyContent: 'center', marginHorizontal: 20, marginTop: 0 },
  text: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(125,255,42,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.3)',
  },
  retryBtnText: { color: Colors.primaryGreen, fontWeight: '700', fontSize: 13 },
});
