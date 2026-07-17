import { ChatInputBar } from '@/components/ChatinputBar';
import { ChatMessage } from '@/components/ChatMessage';
import { ImagePreviewModal } from '@/components/ImagePreviewModel';
import { Colors } from '@/constants/colors';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useChat } from '@/hooks/useChat';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Phone, Video } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';



export default function ChatDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { messages, loading, sending, sendText, sendFile, sendSticker, currentUserId } = useChat(id);

  const [text, setText] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const audio = useAudioRecorder();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  const handleSendText = () => {
    if (!text.trim()) return;
    sendText(text.trim());
    setText('');
    scrollToBottom();
  };

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <ChevronLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <View style={st.headerInfo}>
          <Text style={st.headerName}>{name}</Text>
          <Text style={st.headerStatus}>{loading ? 'Chargement...' : 'En ligne'}</Text>
        </View>
        <View style={st.headerActions}>
          <TouchableOpacity style={st.headerActionBtn}>
            <Phone color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerActionBtn}>
            <Video color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={st.loader}>
          <ActivityIndicator color={Colors.primaryGreen} size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.trackingId}
          contentContainerStyle={st.msgList}
          renderItem={({ item }) => (
            <ChatMessage
              item={item}
              currentUserId={currentUserId}
              onImagePress={setPreviewUri}
            />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={() => (
            <View style={st.emptyWrap}>
              <Text style={st.emptyText}>Aucun message. Commencez la conversation !</Text>
            </View>
          )}
        />
      )}

      {/* Input bar (avec attach, mic, sticker, send) */}
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

      {/* Image preview modal */}
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: Colors.secondaryBg,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  headerStatus: { color: Colors.primaryGreen, fontSize: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerActionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.cardBg,
    alignItems: 'center', justifyContent: 'center',
  },

  msgList: { padding: 16, gap: 6, paddingBottom: 8 },
});