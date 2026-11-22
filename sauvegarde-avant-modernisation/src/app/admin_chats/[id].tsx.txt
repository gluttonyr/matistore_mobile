import { ChatInputBar } from '@/components/ChatinputBar';
import { ChatMessage } from '@/components/ChatMessage';
import { DateSeparator } from '@/components/dateSeparator';
import { ImagePreviewModal } from '@/components/ImagePreviewModel';
import { ChatBackground } from '@/components/ChatBackground';

import { Colors } from '@/constants/colors';
import { MessageType } from '@/data_api/models/message.types';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useChat } from '@/hooks/useChat';
import { useChatSections } from '@/hooks/useChatSection';

import { useClientPresence } from '@/hooks/useClientPresence';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronLeft,
  HeadphonesIcon,
  History,
  Shield,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MessageCategory = 'deposit' | 'withdrawal' | 'support';

const CATEGORY_CONFIG: Record<
  MessageCategory,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  deposit: {
    label: 'Dépôt',
    color: Colors.primaryGreen,
    bg: 'rgba(125,255,42,0.1)',
    icon: <ArrowDownToLine color={Colors.primaryGreen} size={16} />,
  },
  withdrawal: {
    label: 'Retrait',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    icon: <ArrowUpFromLine color="#F59E0B" size={16} />,
  },
  support: {
    label: 'Support',
    color: '#38BDF8',
    bg: 'rgba(56,189,248,0.1)',
    icon: <HeadphonesIcon color="#38BDF8" size={16} />,
  },
};

const QUICK_REPLIES: Record<MessageCategory, string[]> = {
  deposit: [
    'Dépôt validé ✅',
    'Preuve reçue, en cours de traitement...',
    'Veuillez renvoyer la preuve de paiement',
  ],
  withdrawal: [
    'Retrait en cours de traitement',
    'Retrait validé, fonds envoyés ✅',
    'Informations incorrectes, merci de vérifier',
  ],
  support: [
    'Bonjour, comment puis-je vous aider ?',
    'Bonsoir, comment puis-je vous aider ?',
    'Votre problème a été résolu ✅',
    'Votre demande de rétrait a bien été reçu ✅',
    'Votre demande de Dépot a bien été reçu ✅',
  ],
};

export default function AdminChatDetailScreen() {
  const { id, name, category } = useLocalSearchParams<{
    id: string;
    name: string;
    category: MessageCategory;
  }>();

  const cat = (category as MessageCategory) || 'support';
  const catConf = CATEGORY_CONFIG[cat];

  const { messages, loading, sending, sendText, sendFile, sendSticker, currentUserId, deleteMessage, pinMessage, unpinMessage,loadMoreHistory,
    loadingMore,
    hasMoreHistory, } =
    useChat(id);

  const [text, setText] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const listRef = useRef<SectionList>(null);
  const audio = useAudioRecorder();
  const { online: clientOnline } = useClientPresence(id);

  const sections = useChatSections(messages);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      if (!sections.length) return;
      const lastSectionIndex = sections.length - 1;
      const lastItemIndex = sections[lastSectionIndex].data.length - 1;
      try {
        listRef.current?.scrollToLocation({
          sectionIndex: lastSectionIndex,
          itemIndex: lastItemIndex,
          animated,
          viewPosition: 1,
        });
      } catch {}
    }, 120);
  }, [sections]);

  const lastMessageIdRef = useRef<string | null>(null);
useEffect(() => {
  if (messages.length === 0) return;
  const lastId = messages[messages.length - 1].trackingId;
  if (lastId !== lastMessageIdRef.current) {
    lastMessageIdRef.current = lastId;
    scrollToBottom();
  }
}, [messages]);

  const handleSendText = () => {
    if (!text.trim()) return;
    sendText(text.trim());
    setText('');
    scrollToBottom();
  };

  const handleQuickReply = (reply: string) => {
    sendText(reply);
    setShowQuickReplies(false);
    scrollToBottom();
  };

  const handleSendFile = async (
    file: { uri: string; name: string; type: string },
    type: MessageType
  ) => {
    await sendFile(file, type);
    scrollToBottom();
  };

  const handleSendSticker = (stickerImage: string) => {
    sendSticker(stickerImage);
    scrollToBottom();
  };
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <ChatBackground variant="admin" iconColor="#FFFFFF" />
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <View style={[styles.catIconWrap, { backgroundColor: catConf.bg }]}>
          {catConf.icon}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">
            {name}
          </Text>
          <View style={styles.headerSubRow}>
            <View style={[styles.catPill, { backgroundColor: catConf.bg }]}>
              <Text style={[styles.catPillText, { color: catConf.color }]}>
                {catConf.label}
              </Text>
            </View>
            {/* <Text style={styles.headerStatus}>
              {loading ? '' : clientOnline ? 'En ligne' : 'Hors ligne'}
            </Text> */}
          </View>
        </View>
        {cat !== 'support' && (
          <TouchableOpacity
            style={styles.transactionsButton}
            accessibilityLabel="Voir les transactions de cet utilisateur"
            onPress={() => router.push({
              pathname: '/admin_transactions',
              params: { discussionId: id, clientName: name },
            })}
          >
            <History color={Colors.white} size={20} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Messages ── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primaryGreen} size="large" />
        </View>
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => item.trackingId}
          contentContainerStyle={styles.msgList}
          stickySectionHeadersEnabled
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          refreshControl={
    <RefreshControl
      refreshing={loadingMore}
      onRefresh={loadMoreHistory}
      tintColor={Colors.primaryGreen}
      colors={[Colors.primaryGreen]}
      progressBackgroundColor={Colors.cardBg}
    />
  }
          renderSectionHeader={({ section }) => <DateSeparator label={section.title} />}
          renderItem={({ item }) => (
            <ChatMessage
              item={item}
              currentUserId={currentUserId}
              onImagePress={setPreviewUri}
              allowModeration
              onDelete={deleteMessage}
              onPin={pinMessage}
              onUnpin={unpinMessage}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Aucun message pour le moment.</Text>
            </View>
          )}
        />
      )}

      {/* ── Réponses rapides (spécifique admin) ── */}
      {showQuickReplies && (
        <View style={styles.quickRepliesContainer}>
          <View style={styles.quickRepliesHeader}>
            <Text style={styles.quickRepliesTitle}>Réponses rapides</Text>
            <TouchableOpacity onPress={() => setShowQuickReplies(false)}>
              <ChevronDown color="#A78BFA" size={16} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          </View>
          {QUICK_REPLIES[cat].map((reply, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickReplyItem}
              onPress={() => handleQuickReply(reply)}
            >
              <Text style={styles.quickReplyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Bouton toggle réponses rapides ── */}
      <View style={styles.quickToggleRow}>
        <TouchableOpacity
          style={[styles.quickToggleBtn, showQuickReplies && styles.quickToggleBtnActive]}
          onPress={() => setShowQuickReplies((v) => !v)}
        >
          <Shield color={showQuickReplies ? '#A78BFA' : Colors.textSecondary} size={14} />
          <Text
            style={[
              styles.quickToggleText,
              showQuickReplies && { color: '#A78BFA' },
            ]}
          >
            Réponses rapides
          </Text>
          <ChevronDown
            color={showQuickReplies ? '#A78BFA' : Colors.textSecondary}
            size={14}
            style={{ transform: [{ rotate: showQuickReplies ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>

      {/* ── Input bar complet (texte, fichier, mic, sticker) ── */}
      <ChatInputBar
        text={text}
        onChangeText={setText}
        onSendText={handleSendText}
        onSendFile={handleSendFile}
        onSendSticker={handleSendSticker}
        sending={sending}
        audio={audio}
      />

      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.secondaryBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: { padding: 4 },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  catPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  catPillText: { fontSize: 10, fontWeight: '700' },
  headerStatus: { color: Colors.primaryGreen, fontSize: 11 },
  transactionsButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  msgList: { padding: 16, gap: 6, paddingBottom: 8 },

  quickToggleRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.secondaryBg,
  },
  quickToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
  },
  quickToggleBtnActive: {
    borderColor: 'rgba(167,139,250,0.4)',
    backgroundColor: 'rgba(167,139,250,0.1)',
  },
  quickToggleText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },

  quickRepliesContainer: {
    backgroundColor: Colors.secondaryBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  quickRepliesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickRepliesTitle: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  quickReplyItem: {
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  quickReplyText: { color: Colors.white, fontSize: 13 },
});
