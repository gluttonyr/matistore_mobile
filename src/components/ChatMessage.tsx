import { Colors } from '@/constants/colors';
import { MessageType } from '@/data_api/models/message.types';
import { resolveFileUrl } from '@/hooks/useFileUrl';
import { Check, CheckCheck, Pin } from 'lucide-react-native';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AudioPlayer } from './Audioplayer';

type Props = {
  item: any;
  currentUserId: string | undefined;
  onImagePress: (uri: string) => void;
  /** Épinglage/suppression réservés à la modération (ex: forum admin). */
  allowModeration?: boolean;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
};

export function ChatMessage({
  item,
  currentUserId,
  onImagePress,
  allowModeration = false,
  onDelete,
  onPin,
  onUnpin,
}: Props) {
  const isMe = item.senderTrackingId === currentUserId;
  const time = item.dateEnvoi
    ? new Date(item.dateEnvoi).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
    : new Date(item.createdAt).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

  const canModerate = allowModeration && !item.isDeleted && (onDelete || onPin || onUnpin);

  const handleLongPress = () => {
    if (!canModerate) return;
    const options: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];
    if (onPin && !item.epingle) options.push({ text: 'Épingler', onPress: () => onPin(item.trackingId) });
    if (onUnpin && item.epingle) options.push({ text: 'Désépingler', onPress: () => onUnpin(item.trackingId) });
    if (onDelete) options.push({ text: 'Supprimer', style: 'destructive', onPress: () => onDelete(item.trackingId) });
    options.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert('Message', undefined, options);
  };

  // ── Message supprimé ──
  if (item.isDeleted) {
    return (
      <View style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}>
        <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleOther, { opacity: 0.6 }]}>
          <Text style={{ color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
            🚫 Message supprimé
          </Text>
        </View>
      </View>
    );
  }

  const pinBadge = item.epingle ? (
    <View style={st.pinBadge}>
      <Pin color="#F59E0B" size={10} />
      <Text style={st.pinBadgeText}>Épinglé</Text>
    </View>
  ) : null;

  // ── Sticker ── (contenu = nom de fichier du sticker, dossier "stickers", pas "messages")
  if (item.type === MessageType.STICKER) {
    const stickerUri = resolveFileUrl('stickers', item.contenu);
    return (
      <TouchableOpacity
        activeOpacity={canModerate ? 0.7 : 1}
        onLongPress={handleLongPress}
        style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}
      >
        {pinBadge}
        <Image
          source={{ uri: stickerUri }}
          style={st.stickerMsg}
          resizeMode="contain"
        />
        <Text style={[st.msgTime, { marginTop: 2 }]}>{time}</Text>
      </TouchableOpacity>
    );
  }

  // ── Image ──
  if (item.type === MessageType.IMAGE) {
    const imageUri = resolveFileUrl('messages', item.file ?? item.contenu);
    return (
      <View style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}>
        {pinBadge}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(imageUri)}
          onLongPress={handleLongPress}
        >
          <View style={st.imgWrap}>
            <Image source={{ uri: imageUri }} style={st.imageMsg} resizeMode="cover" />
            <View style={st.imgZoomHint}>
              <Text style={{ color: '#fff', fontSize: 10 }}>🔍</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={[st.msgMeta, { alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 4 }]}>
          <Text style={st.msgTime}>{time}</Text>
          {isMe && (item.lu
            ? <CheckCheck color={Colors.primaryGreen} size={12} />
            : <Check color={Colors.textSecondary} size={12} />)}
        </View>
      </View>
    );
  }

  // ── Audio ──
  if (item.type === MessageType.AUDIO) {
    const audioUri = resolveFileUrl('messages', item.file ?? item.contenu);
    return (
      <TouchableOpacity
        activeOpacity={canModerate ? 0.85 : 1}
        onLongPress={handleLongPress}
        style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}
      >
        {pinBadge}
        <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleOther]}>
          <AudioPlayer uri={audioUri} isMe={isMe} />
          <View style={st.msgMeta}>
            <Text style={[st.msgTime, isMe && st.msgTimeMe]}>{time}</Text>
            {isMe && (item.lu
              ? <CheckCheck color={Colors.primaryGreen} size={12} />
              : <Check color={Colors.textSecondary} size={12} />)}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Texte (défaut) ──
  return (
    <TouchableOpacity
      activeOpacity={canModerate ? 0.85 : 1}
      onLongPress={handleLongPress}
      style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}
    >
      {!isMe && item.sender?.username && (
        <Text style={st.senderName}>{item.sender.nom} {item.sender.prenom}</Text>
      )}
      {pinBadge}
      <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleOther]}>
        <Text style={[st.msgText, isMe ? st.msgTextMe : st.msgTextOther]}>
          {item.contenu}
        </Text>
        <View style={st.msgMeta}>
          <Text style={[st.msgTime, isMe && st.msgTimeMe]}>{time}</Text>
          {isMe && (item.lu
            ? <CheckCheck color={Colors.primaryGreen} size={12} />
            : <Check color={Colors.textSecondary} size={12} />)}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  msgRow: { maxWidth: '80%', marginBottom: 4 },
  msgRowMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgRowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderName: { color: Colors.primaryGreen, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  pinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginBottom: 3,
  },
  pinBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },

  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  bubbleMe: { backgroundColor: Colors.primaryGreen, borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: Colors.cardBg, borderWidth: 1,
    borderColor: Colors.border, borderBottomLeftRadius: 4,
  },

  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextMe: { color: '#000', fontWeight: '500' },
  msgTextOther: { color: Colors.white },

  msgMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end',
  },
  msgTime: { color: 'rgba(0,0,0,0.45)', fontSize: 10 },
  msgTimeMe: { color: 'rgba(0,0,0,0.45)' },

  imgWrap: { borderRadius: 14, overflow: 'hidden', position: 'relative' },
  imageMsg: { width: 220, height: 160 },
  imgZoomHint: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
  },
  stickerMsg: { width: 100, height: 100 },
});