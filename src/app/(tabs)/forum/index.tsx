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
import { Lock, MessageSquare, Pin } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ForumScreen() {
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

  const { messages, loading, sending, discussionActive, sendText, sendFile, sendSticker, currentUserId } =
    useChat(discussionId ?? '');

  const [text, setText] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const audio = useAudioRecorder();

  const locked = (discussionActive ?? discussionActiveInitial) === false;
  const pinnedMessage = messages.find((m) => m.epingle && !m.isDeleted);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  const handleSendText = () => {
    if (!text.trim() || locked) return;
    sendText(text.trim());
    setText('');
    scrollToBottom();
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
            <MessageSquare color={Colors.primaryGreen} size={18} strokeWidth={2.5} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Forum</Text>
            <Text style={styles.headerSub}>Discussion générale</Text>
          </View>
        </View>
      </View>

      {/* ── Pinned message ── */}
      {pinnedMessage && (
        <View style={styles.pinnedBar}>
          <Pin color="#F59E0B" size={14} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pinnedBarLabel}>Message épinglé</Text>
            <Text style={styles.pinnedBarText} numberOfLines={1}>{pinnedMessage.contenu}</Text>
          </View>
        </View>
      )}

      {/* ── Forum locked banner ── */}
      {locked && (
        <View style={styles.lockedBanner}>
          <Lock color="#F87171" size={14} />
          <Text style={styles.lockedText}>Forum verrouillé — Lecture seule</Text>
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
            <ChatMessage item={item} currentUserId={currentUserId} onImagePress={setPreviewUri} />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Aucun message. Soyez le premier à écrire !</Text>
            </View>
          )}
        />
      )}

      {/* ── Input ── */}
      {locked ? (
        <View style={styles.lockedInputRow}>
          <Lock color={Colors.textSecondary} size={14} />
          <Text style={styles.lockedInputText}>Le forum est verrouillé par un administrateur</Text>
        </View>
      ) : (
        <ChatInputBar
          text={text}
          onChangeText={setText}
          onSendText={handleSendText}
          onSendFile={sendFile}
          onSendSticker={sendSticker}
          sending={sending}
          audio={audio}
          allowStickers={false}
        />
      )}

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
    backgroundColor: 'rgba(125,255,42,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '900' },
  headerSub: { color: Colors.textSecondary, fontSize: 11, marginTop: 1 },

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

  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(248,113,113,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  lockedText: { color: '#F87171', fontSize: 12, fontWeight: '600' },

  msgList: { padding: 16, gap: 6, paddingBottom: 8 },

  lockedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.secondaryBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lockedInputText: { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic' },
});
