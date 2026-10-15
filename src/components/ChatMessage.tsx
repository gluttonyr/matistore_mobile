import { Colors } from '@/constants/colors';
import { MessageType } from '@/data_api/models/message.types';
import { resolveFileUrl } from '@/hooks/useFileUrl';
import { Check, CheckCheck, Copy, Pin, PinOff, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Clipboard, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { AudioPlayer } from './Audioplayer';
import { ActionSheet, ActionSheetOption } from './actionSheet';
import { ShimmerImage } from './shimerImage';

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

// Détecte les messages générés automatiquement (dépôt/retrait) au format
// "Label : Valeur" ligne par ligne, pour permettre de copier chaque valeur
// individuellement en tapant dessus.
type StructuredLine = { text: string; value?: string; copyable: boolean };

function parseStructuredLines(content: string): StructuredLine[] | null {
  if (!content) return null;
  const lines = content.split('\n');
  if (lines.length < 2) return null;

  const hasStructuredHeader = lines[0].includes('📥') || lines[0].includes('📤');
  const copyableField = /^(?:transaction|type|opérateur|montant|numéro(?: de téléphone)?|téléphone|compte 1xbet|code(?: de retrait| 1xbet)?|référence(?: confirmée| déclarée par le client)?|reference|date de demande|date de traitement)\s*:/i;
  const hasTransactionFields = lines.some((line) => copyableField.test(line.trim()));
  if (!hasStructuredHeader && !hasTransactionFields) return null;

  return lines.map((line, idx) => {
    if (idx === 0 && hasStructuredHeader) {
      return { text: line.replace(/\*/g, ''), copyable: false };
    }
    const match = line.match(/^(.+?)\s*:\s*(.+)$/);
    const shouldCopy = !!match && (hasStructuredHeader || copyableField.test(line.trim()));
    if (!match || !shouldCopy) {
      return { text: line, copyable: false };
    }
    const [, , value] = match;
    return { text: line, value: value.trim(), copyable: true };
  });
}

export function ChatMessage({
  item,
  currentUserId,
  onImagePress,
  allowModeration = false,
  onDelete,
  onPin,
  onUnpin,
}: Props) {
  // Options actuellement affichées dans la bottom-sheet (null = fermée).
  const [sheetOptions, setSheetOptions] = useState<ActionSheetOption[] | null>(null);

  const isMe = item.senderTrackingId === currentUserId;
  const time = item.dateEnvoi
    ? new Date(item.dateEnvoi).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
    : new Date(item.createdAt).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });

  const handleCopy = (value: string) => {
    Clipboard.setString(value);
    Toast.show({ type: 'success', text1: 'Copié !', visibilityTime: 1200 });
  };

  // Modération admin (forum, chat admin...) : peut agir sur les messages des autres.
  const canModerate = allowModeration && !item.isDeleted && (onDelete || onPin || onUnpin);

  // Suppression de son propre message : disponible partout, même sans modération,
  // du moment qu'on a passé `onDelete`. On évite le doublon si `canModerate` gère déjà
  // la suppression (pour ne pas afficher deux fois "Supprimer" dans le menu).
  const canDeleteOwn = isMe && !item.isDeleted && !!onDelete && !canModerate;

  // Copier tout le message : dispo pour tous les messages texte, peu importe l'auteur.
  const canCopyWhole = !item.isDeleted && item.type === MessageType.TEXT && !!item.contenu;

  const canLongPress = canModerate || canDeleteOwn || canCopyWhole;

  const handleLongPress = () => {
    if (!canLongPress) return;
    const options: ActionSheetOption[] = [];

    if (canCopyWhole) {
      options.push({
        key: 'copy',
        text: 'Copier',
        icon: <Copy color={Colors.textSecondary} size={18} />,
        onPress: () => handleCopy(item.contenu),
      });
    }
    if (canModerate) {
      if (onPin && !item.epingle) {
        options.push({
          key: 'pin',
          text: 'Épingler',
          icon: <Pin color={Colors.primaryGreen} size={18} />,
          onPress: () => onPin(item.trackingId),
        });
      }
      if (onUnpin && item.epingle) {
        options.push({
          key: 'unpin',
          text: 'Désépingler',
          icon: <PinOff color={Colors.textSecondary} size={18} />,
          onPress: () => onUnpin(item.trackingId),
        });
      }
      if (onDelete) {
        options.push({
          key: 'delete',
          text: 'Supprimer',
          style: 'destructive',
          icon: <Trash2 color="#ef4444" size={18} />,
          onPress: () => onDelete(item.trackingId),
        });
      }
    } else if (canDeleteOwn) {
      options.push({
        key: 'delete',
        text: 'Supprimer',
        style: 'destructive',
        icon: <Trash2 color="#ef4444" size={18} />,
        onPress: () => onDelete!(item.trackingId),
      });
    }

    options.push({ key: 'cancel', text: 'Annuler', style: 'cancel' });
    setSheetOptions(options);
  };

  const pinBadge = item.epingle ? (
    <View style={st.pinBadge}>
      <Pin color="#F59E0B" size={10} />
      <Text style={st.pinBadgeText}>Épinglé</Text>
    </View>
  ) : null;

  // On construit le contenu propre à chaque type de message dans une variable,
  // puis on rend UNE SEULE fois le <ActionSheet> à la fin (commun à tous les types).
  let content: React.ReactNode;

  if (item.isDeleted) {
    // ── Message supprimé ──
    content = (
      <View style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}>
        <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleOther, { opacity: 0.6 }]}>
          <Text style={{ color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
            🚫 Message supprimé
          </Text>
        </View>
      </View>
    );
  } else if (item.type === MessageType.STICKER) {
    // ── Sticker ── (contenu = nom de fichier du sticker, dossier "stickers", pas "messages")
    const stickerUri = resolveFileUrl('stickers', item.contenu);
    content = (
      <TouchableOpacity
        activeOpacity={canLongPress ? 0.7 : 1}
        onLongPress={handleLongPress}
        style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}
      >
        {pinBadge}
        <Image source={{ uri: stickerUri }} style={st.stickerMsg} resizeMode="contain" />
        <Text style={[st.msgTime, isMe && st.msgTimeMe, { marginTop: 2 }]}>{time}</Text>
      </TouchableOpacity>
    );
  } else if (item.type === MessageType.IMAGE) {
    // ── Image ──
    const imageUri = resolveFileUrl('messages', item.file ?? item.contenu);
    content = (
      <View style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}>
        {pinBadge}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(imageUri)}
          onLongPress={handleLongPress}
        >
          <View style={st.imgWrap}>
            <ShimmerImage source={{ uri: imageUri }} style={st.imageMsg} resizeMode="cover" />
            <View style={st.imgZoomHint}>
              <Text style={{ color: '#fff', fontSize: 10 }}>🔍</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={[st.msgMeta, { alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 4 }]}>
          <Text style={[st.msgTime, isMe && st.msgTimeMe]}>{time}</Text>
          {isMe &&
            (item.lu ? (
              <CheckCheck color={Colors.primaryGreen} size={12} />
            ) : (
              <Check color={Colors.textSecondary} size={12} />
            ))}
        </View>
      </View>
    );
  } else if (item.type === MessageType.AUDIO) {
    // ── Audio ──
    const audioUri = resolveFileUrl('messages', item.file ?? item.contenu);
    content = (
      <TouchableOpacity
        activeOpacity={canLongPress ? 0.85 : 1}
        onLongPress={handleLongPress}
        style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}
      >
        {pinBadge}
        <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleOther]}>
          <AudioPlayer uri={audioUri} isMe={isMe} />
          <View style={st.msgMeta}>
            <Text style={[st.msgTime, isMe && st.msgTimeMe]}>{time}</Text>
            {isMe &&
              (item.lu ? (
                <CheckCheck color={Colors.primaryGreen} size={12} />
              ) : (
                <Check color={Colors.textSecondary} size={12} />
              ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  } else {
    // ── Texte (défaut) ──
    const structured = parseStructuredLines(item.contenu);
    content = (
      <TouchableOpacity
        activeOpacity={canLongPress ? 0.85 : 1}
        onLongPress={handleLongPress}
        style={[st.msgRow, isMe ? st.msgRowMe : st.msgRowOther]}
      >
        {!isMe && item.sender?.username && (
          <Text style={st.senderName}>{item.sender.nom} {item.sender.prenom}</Text>
        )}
        {pinBadge}
        <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleOther]}>
          {structured ? (
            <View>
              {structured.map((line, idx) =>
                line.copyable ? (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleCopy(line.value!)}
                    activeOpacity={0.6}
                    style={st.fieldRow}
                  >
                    <Text style={[st.msgText, isMe ? st.msgTextMe : st.msgTextOther]}>
                      {line.text}
                    </Text>
                    <Copy
                      color={isMe ? 'rgba(0,0,0,0.45)' : Colors.textSecondary}
                      size={13}
                      style={{ marginLeft: 6, flexShrink: 0 }}
                    />
                  </TouchableOpacity>
                ) : (
                  <Text
                    key={idx}
                    style={[st.msgText, isMe ? st.msgTextMe : st.msgTextOther, st.msgTitleLine]}
                  >
                    {line.text}
                  </Text>
                )
              )}
            </View>
          ) : (
            <Text style={[st.msgText, isMe ? st.msgTextMe : st.msgTextOther]}>
              {item.contenu}
            </Text>
          )}
          <View style={st.msgMeta}>
            <Text style={[st.msgTime, isMe && st.msgTimeMe]}>{time}</Text>
            {isMe &&
              (item.lu ? (
                <CheckCheck color={Colors.primaryGreen} size={12} />
              ) : (
                <Check color={Colors.textSecondary} size={12} />
              ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ActionSheet commun à TOUS les types de message ci-dessus.
  return (
    <>
      {content}
      <ActionSheet
        visible={!!sheetOptions}
        onClose={() => setSheetOptions(null)}
        title="Message"
        options={sheetOptions ?? []}
      />
    </>
  );
}

const st = StyleSheet.create({
  // ============================================================
  // CONTENEUR DU MESSAGE
  // ============================================================

  msgRow: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    marginBottom: 4,
  },

  msgRowMe: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },

  msgRowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },

  // ============================================================
  // NOM EXPÉDITEUR
  // ============================================================

  senderName: {
    color: Colors.primaryGreen,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    marginBottom: 2,
  },

  // ============================================================
  // BADGE ÉPINGLÉ
  // ============================================================

  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  pinBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    marginLeft: 3,
  },

  // ============================================================
  // BULLE
  // ============================================================

  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  bubbleMe: {
    backgroundColor: Colors.primaryGreen,
    borderBottomRightRadius: 4,
  },

  bubbleOther: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },

  // ============================================================
  // TEXTE
  // ============================================================

  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },

  msgTextMe: {
    color: '#000',
    fontWeight: '500',
  },

  msgTextOther: {
    color: Colors.white,
  },

  msgTitleLine: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    marginBottom: 3,
  },

  // ============================================================
  // LIGNES STRUCTURÉES
  // ============================================================

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },

  // ============================================================
  // MÉTA
  // ============================================================

  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },

  msgTime: {
    color: Colors.white,
    fontSize: 10,
    lineHeight: 13,
  },

  msgTimeMe: {
    color: '#000',
  },

  // ============================================================
  // IMAGE
  // ============================================================

  imgWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },

  imageMsg: {
    width: 220,
    height: 160,
  },

  imgZoomHint: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },

  // ============================================================
  // STICKER
  // ============================================================

  stickerMsg: {
    width: 100,
    height: 100,
  },
});
