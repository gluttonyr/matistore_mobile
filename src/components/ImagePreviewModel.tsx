import { Colors } from '@/constants/colors';
import { Download, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  uri: string | null;
  onClose: () => void;
};

export function ImagePreviewModal({ uri, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!uri) return;
    setDownloading(true);
    try {
      // Import dynamique (au lieu de require()) : les modules natifs indisponibles
      // (ex: Expo Go, ou dev client pas encore reconstruit avec expo-media-library)
      // rejettent alors la promesse et sont correctement attrapés ci-dessous.
      const [MediaLibrary, FileSystem] = await Promise.all([
        import('expo-media-library'),
        import('expo-file-system/legacy'),
      ]);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "Autorisez l'accès à la galerie pour télécharger.");
        return;
      }

      let localUri = uri;
      if (uri.startsWith('http')) {
        const filename = uri.split('/').pop() ?? `image_${Date.now()}.jpg`;
        const dest = `${FileSystem.cacheDirectory}${filename}`;
        const { uri: downloaded } = await FileSystem.downloadAsync(uri, dest);
        localUri = downloaded;
      }

      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Succès', 'Image sauvegardée dans la galerie !');
    } catch (e) {
      console.error('Download error:', e);
      const isMissingNativeModule = e instanceof Error && /native module/i.test(e.message);
      if (isMissingNativeModule) {
        Alert.alert(
          'Indisponible sur cette version de l\'app',
          "Le téléchargement nécessite un build natif :\nnpx expo prebuild\nnpx expo run:android",
        );
      } else {
        Alert.alert('Erreur', "Impossible de sauvegarder l'image.");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={st.overlay}>
        <TouchableOpacity style={st.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <X color="#fff" size={22} />
        </TouchableOpacity>

        {uri && (
          <Image source={{ uri }} style={st.image} resizeMode="contain" />
        )}

        <TouchableOpacity
          style={[st.downloadBtn, downloading && st.downloadBtnDisabled]}
          onPress={handleDownload}
          activeOpacity={0.85}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Download color="#000" size={18} />
              <Text style={st.downloadText}>Télécharger</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: (StatusBar.currentHeight ?? 44) + 8,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.78,
  },
  downloadBtn: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryGreen,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 28,
  },
  downloadBtnDisabled: { opacity: 0.6 },
  downloadText: { color: '#000', fontWeight: '700', fontSize: 15 },
});