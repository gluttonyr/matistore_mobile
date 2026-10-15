import { ChatInputBar } from '@/components/ChatinputBar';
import { ChatMessage } from '@/components/ChatMessage';
import { DateSeparator } from '@/components/dateSeparator';
import { HistoryLoader } from '@/components/historyLoader';
import { ImagePreviewModal } from '@/components/ImagePreviewModel';
import { ConnectionErrorState } from '@/components/ui/ConnectionErrorState';
import { ChatBackground } from '@/components/ChatBackground';
import { Colors } from '@/constants/colors';
import type { Discussion } from '@/data_api/models/discussion.types';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useChat } from '@/hooks/useChat';
import { useChatSections } from '@/hooks/useChatSection';
import {
  fetchForumDiscussionSummary,
  FORUM_DISCUSSION_QUERY_KEY,
  FORUM_HAS_NEW_QUERY_KEY,
} from '@/hooks/useForumHasNew';
import { forumStorage } from '@/storage/forumStorage';
import { Lock, MessageSquare, Pin } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ForumScreen() {
  const queryClient = useQueryClient();
  const [discussionId, setDiscussionId] = useState<string | null>(null);
  const [discussionActiveInitial, setDiscussionActiveInitial] = useState(true);
  const [forumLoading, setForumLoading] = useState(true);
  const [forumError, setForumError] = useState('');

  const applyForumSummary = useCallback((forum: Discussion | null) => {
    if (!forum) {
      setForumError('Le forum est momentanément indisponible.');
      return;
    }
    setDiscussionId(forum.trackingId);
    setDiscussionActiveInitial(forum.active);
    void forumStorage.setLastSeenAt(new Date().toISOString()).catch(() => {});
    queryClient.setQueryData(FORUM_HAS_NEW_QUERY_KEY, false);
  }, [queryClient]);

  const loadForum = useCallback(() => {
    setForumError('');
    const cachedForum = queryClient.getQueryData<Discussion | null>(FORUM_DISCUSSION_QUERY_KEY);
    if (cachedForum) {
      applyForumSummary(cachedForum);
      setForumLoading(false);
    } else {
      setForumLoading(true);
    }

    queryClient.fetchQuery({
      queryKey: FORUM_DISCUSSION_QUERY_KEY,
      queryFn: fetchForumDiscussionSummary,
      staleTime: 20_000,
      retry: false,
    })
      .then((forum) => {
        if (forum) applyForumSummary(forum);
        else if (!cachedForum) setForumError('Le forum est momentanément indisponible.');
      })
      .catch((err) => {
        if (!cachedForum) setForumError(getApiErrorMessage(err));
      })
      .finally(() => setForumLoading(false));
  }, [applyForumSummary, queryClient]);

  useEffect(() => {
    loadForum();
  }, [loadForum]);

  const { messages, loading, sending, discussionActive, sendText, sendFile, sendSticker, currentUserId,loadMoreHistory,
    loadingMore,
    hasMoreHistory, } =
    useChat(discussionId ?? '', 40);

  const [text, setText] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const listRef = useRef<SectionList>(null);
  const audio = useAudioRecorder();

  const locked = (discussionActive ?? discussionActiveInitial) === false;
  const pinnedMessage = messages.find((m) => m.epingle && !m.isDeleted);

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
    if (!text.trim() || locked) return;
    sendText(text.trim());
    setText('');
    scrollToBottom();
  };



  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ChatBackground variant="forum" />
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
            <ChatMessage item={item} currentUserId={currentUserId} onImagePress={setPreviewUri} />
          )}
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
