import { Colors } from '@/constants/colors';
import { Sticker } from '@/data_api/models/sticker.types';
import { stickerService } from '@/data_api/services/stickerService';
import { useFileUrl } from '@/hooks/useFileUrl';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  onSelect: (sticker: Sticker) => void;
  onClose: () => void;
};

// ─── Composant image (respecte les règles des hooks dans une liste) ───────────
function StickerThumbnail({ image, style }: { image?: string | null; style?: any }) {
  const uri = useFileUrl('stickers', image);
  if (!uri) return <View style={[style, { backgroundColor: Colors.cardBg }]} />;
  return <Image source={{ uri }} style={style} resizeMode="contain" />;
}

export function StickerPicker({ visible, onSelect, onClose }: Props) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    stickerService
      .getAll()
      .then(setStickers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={st.overlay} onPress={onClose}>
        <View style={st.sheet}>
          <View style={st.handle} />
          <Text style={st.title}>Stickers</Text>
          {loading ? (
            <View style={st.loaderWrap}>
              <ActivityIndicator color={Colors.primaryGreen} />
            </View>
          ) : stickers.length === 0 ? (
            <Text style={st.empty}>Aucun sticker disponible pour le moment.</Text>
          ) : (
            <ScrollView contentContainerStyle={st.grid}>
              {stickers.map((s) => (
                <TouchableOpacity
                  key={s.trackingId}
                  style={st.cell}
                  onPress={() => { onSelect(s); onClose(); }}
                  activeOpacity={0.75}
                >
                  <StickerThumbnail image={s.image} style={st.img} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.secondaryBg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40, paddingTop: 12, maxHeight: '55%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  title: { color: Colors.white, fontSize: 16, fontWeight: '800', paddingHorizontal: 20, marginBottom: 12 },
  loaderWrap: { paddingVertical: 24, alignItems: 'center' },
  empty: {
    color: Colors.textSecondary, fontSize: 13, textAlign: 'center',
    paddingHorizontal: 20, lineHeight: 20, paddingBottom: 20,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 4 },
  cell: {
    width: '22%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: Colors.cardBg, margin: '1.5%',
  },
  img: { width: '80%', height: '80%' },
});
