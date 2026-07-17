import { ChatInputBar } from '@/components/ChatinputBar';
import { ChatMessage } from '@/components/ChatMessage';
import { ImagePreviewModal } from '@/components/ImagePreviewModel';
import { ConnectionErrorState } from '@/components/ui/ConnectionErrorState';
import { Colors } from '@/constants/colors';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { DiscussionType } from '@/data_api/models/discussion.types';
import { discussionService } from '@/data_api/services/discussionService';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useChat } from '@/hooks/useChat';
import { forumStorage } from '@/storage/forumStorage';
import {
  ChevronDown,
  Crown,
  Lock,
  MessageSquare,
  Pin,
  Settings,
  Shield,
  Unlock,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const QUICK_REPLIES_ADMIN = [
  '📢 Rappel : Respectez les règles du forum.',
  '✅ Votre demande a été traitée avec succès.',
  '⚠️ Attention, ce type de contenu est interdit.',
  '🔧 Maintenance prévue ce soir à 22h00.',
  '🎉 Nouvelle fonctionnalité disponible !',
];

export default function AdminForumScreen() {
  const [discussionId, setDiscussionId] = useState<string | null>(null);
  const [discussionActiveInitial, setDiscussionActiveInitial] = useState(true);
  const [forumLoading, setForumLoading] = useState(true);
  const [forumError, setForumError] = useState('');

  const loadForum = useCallback(() => {
    setForumLoading(true);
    setForumError('');
    discussionService.getByType(DiscussionType.FORUM)
      .then((list) => {
        const forum = list[0];
        if (forum) {
          setDiscussionId(forum.trackingId);
          setDiscussionActiveInitial(forum.active);
          // Ouvrir le forum = l'avoir vu : efface la pastille "nouveau" de l'onglet.
          forumStorage.setLastSeenAt(new Date().toISOString());
        } else {
          setForumError('Le forum est momentanément indisponible.');
        }
      })
      .catch((err) => setForumError(getApiErrorMessage(err)))
      .finally(() => setForumLoading(false));
  }, []);

  useEffect(() => {
    loadForum();
  }, [loadForum]);

  const {
    messages,
    loading,
    sending,
    discussionActive,
    sendText,
    sendFile,
    sendSticker,
    deleteMessage,
    pinMessage,
    unpinMessage,
    toggleDiscussionLock,
    currentUserId,
  } = useChat(discussionId ?? '');

  const [text, setText] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const listRef = useRef<FlatList>(null);
  const audio = useAudioRecorder();

  const locked = (discussionActive ?? discussionActiveInitial) === false;
  const pinnedMessage = messages.find((m) => m.epingle && !m.isDeleted);
  const totalMessages = messages.filter((m) => !m.isDeleted).length;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  const handleSendText = (msgText?: string) => {
    const content = (msgText ?? text).trim();
    if (!content) return;
    sendText(content);
    setText('');
    setShowQuickReplies(false);
    scrollToBottom();
  };

  const handleToggleLock = () => {
    toggleDiscussionLock(locked);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <MessageSquare color="#A78BFA" size={17} strokeWidth={2.5} />
          </View>
          <View>
            <View style={styles.adminBadgeRow}>
              <Shield color="#A78BFA" size={10} />
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
            <Text style={styles.headerTitle}>Forum</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.settingsBtn, showSettings && styles.settingsBtnActive]}
          onPress={() => setShowSettings((v) => !v)}
        >
          <Settings color={showSettings ? '#A78BFA' : Colors.textSecondary} size={18} />
        </TouchableOpacity>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{totalMessages}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
        <View style={[styles.statCard, locked && styles.statCardLocked]}>
          {locked
            ? <Lock color="#F87171" size={14} />
            : <Unlock color={Colors.primaryGreen} size={14} />}
          <Text style={[styles.statLabel, { marginTop: 3, color: locked ? '#F87171' : Colors.primaryGreen }]}>
            {locked ? 'Verrouillé' : 'Ouvert'}
          </Text>
        </View>
      </View>

      {/* ── Settings panel ── */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              {locked ? <Lock color="#F87171" size={16} /> : <Unlock color={Colors.primaryGreen} size={16} />}
              <Text style={styles.settingLabel}>
                {locked ? 'Forum verrouillé' : 'Forum ouvert'}
              </Text>
            </View>
            <Switch
              value={locked}
              onValueChange={handleToggleLock}
              trackColor={{ false: Colors.border, true: 'rgba(248,113,113,0.4)' }}
              thumbColor={locked ? '#F87171' : Colors.textSecondary}
            />
          </View>
          <Text style={styles.settingHint}>
            Verrouillé : seuls les administrateurs peuvent écrire dans le forum.
          </Text>
        </View>
      )}

      {/* ── Pinned bar ── */}
      {pinnedMessage && (
        <View style={styles.pinnedBar}>
          <Pin color="#F59E0B" size={13} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pinnedBarLabel}>Épinglé</Text>
            <Text style={styles.pinnedBarText} numberOfLines={1}>{pinnedMessage.contenu}</Text>
          </View>
          <TouchableOpacity onPress={() => unpinMessage(pinnedMessage.trackingId)}>
            <Text style={styles.unpinLink}>Retirer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Messages ── */}
      {forumError ? (
        <ConnectionErrorState onRetry={loadForum} fullscreen />
      ) : forumLoading || loading || !discussionId ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primaryGreen} size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.trackingId}
          contentContainerStyle={styles.msgList}
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
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Aucun message pour le moment.</Text>
            </View>
          )}
        />
      )}

      {/* ── Quick replies ── */}
      {showQuickReplies && (
        <View style={styles.quickRepliesContainer}>
          <Text style={styles.quickRepliesTitle}>RÉPONSES RAPIDES</Text>
          {QUICK_REPLIES_ADMIN.map((r, i) => (
            <TouchableOpacity key={i} style={styles.quickReplyItem} onPress={() => handleSendText(r)}>
              <Text style={styles.quickReplyText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Input ── */}
      <View style={styles.quickToggleRow}>
        <TouchableOpacity
          style={[styles.quickToggleBtn, showQuickReplies && styles.quickToggleBtnActive]}
          onPress={() => setShowQuickReplies((v) => !v)}
        >
          <Crown color={showQuickReplies ? '#A78BFA' : Colors.textSecondary} size={14} />
          <Text style={[styles.quickToggleText, showQuickReplies && { color: '#A78BFA' }]}>
            Réponses rapides
          </Text>
          <ChevronDown
            color={showQuickReplies ? '#A78BFA' : Colors.textSecondary}
            size={14}
            style={{ transform: [{ rotate: showQuickReplies ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>

      <ChatInputBar
        text={text}
        onChangeText={setText}
        onSendText={() => handleSendText()}
        onSendFile={sendFile}
        onSendSticker={sendSticker}
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
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.secondaryBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  adminBadgeText: { color: '#A78BFA', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '900' },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnActive: {
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderColor: 'rgba(167,139,250,0.3)',
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.secondaryBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  statCardLocked: { borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.05)' },
  statNum: { color: Colors.primaryGreen, fontSize: 18, fontWeight: '900' },
  statLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600' },

  settingsPanel: {
    backgroundColor: Colors.secondaryBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingLabel: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  settingHint: { color: Colors.textSecondary, fontSize: 11, paddingHorizontal: 2 },

  pinnedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,158,11,0.15)',
  },
  pinnedBarLabel: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
  pinnedBarText: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  unpinLink: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },

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
    maxHeight: 200,
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
