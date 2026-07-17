import { Colors } from '@/constants/colors';
import { MessageType } from '@/data_api/models/message.types';
import { Sticker } from '@/data_api/models/sticker.types';
import * as ImagePicker from 'expo-image-picker';
import {
  Image as ImageIcon,
  Mic,
  Paperclip,
  Send,
  Smile,
  StopCircle,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { StickerPicker } from './StickerPicker';
import { AudioHook } from '@/hooks/useAudioRecorder';

type Props = {
  text: string;
  onChangeText: (v: string) => void;
  onSendText: () => void;
  onSendFile: (file: { uri: string; name: string; type: string }, type: MessageType) => Promise<void>;
  onSendSticker: (stickerImage: string) => void;
  sending: boolean;
  audio: AudioHook;
  /** Les stickers ne sont pour l'instant disponibles que côté admin. */
  allowStickers?: boolean;
};

export function ChatInputBar({
  text,
  onChangeText,
  onSendText,
  onSendFile,
  onSendSticker,
  sending,
  audio,
  allowStickers = true,
}: Props) {
  const [showStickers, setShowStickers] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const fmtDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handlePickImage = async () => {
    setShowAttachMenu(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const extension = mimeType.split('/')[1] ?? 'jpg';
      await onSendFile(
        {
          uri: asset.uri,
          name: asset.fileName ?? `img_${Date.now()}.${extension}`,
          type: mimeType,
        },
        MessageType.IMAGE,
      );
    } catch (e) {
      console.error('Image upload error:', e);
      Alert.alert('Erreur', "Impossible de charger l'image.");
    }
  };

  const handleMicPress = async () => {
    if (!audio.isAvailable) {
      Alert.alert(
        'Module audio indisponible',
        "Lancez un prebuild Expo pour activer l'audio :\nnpx expo prebuild\nnpx expo run:android",
      );
      return;
    }
    if (audio.isRecording) {
      const result = await audio.stopRecording();
      if (!result) return;
      await onSendFile(
        { uri: result.uri, name: `audio_${Date.now()}.m4a`, type: 'audio/m4a' },
        MessageType.AUDIO,
      );
    } else {
      await audio.startRecording();
    }
  };

  const handleStickerSelect = (sticker: Sticker) => {
    if (!sticker.image) return;
    onSendSticker(sticker.image);
  };

  return (
    <>
      {/* Recording bar */}
      {audio.isRecording && (
        <View style={st.recordingBar}>
          <View style={st.recordingDot} />
          <Text style={st.recordingText}>
            Enregistrement... {fmtDuration(audio.recordingDuration)}
          </Text>
          <TouchableOpacity onPress={audio.cancelRecording} style={{ padding: 4 }}>
            <X color={Colors.textSecondary} size={18} />
          </TouchableOpacity>
        </View>
      )}

      {/* Attach menu */}
      {showAttachMenu && (
        <View style={st.attachMenu}>
          <TouchableOpacity style={st.attachOption} onPress={handlePickImage}>
            <View style={st.attachIcon}>
              <ImageIcon color={Colors.primaryGreen} size={22} />
            </View>
            <Text style={st.attachLabel}>Image</Text>
          </TouchableOpacity>
          {allowStickers && (
            <TouchableOpacity
              style={st.attachOption}
              onPress={() => { setShowAttachMenu(false); setShowStickers(true); }}
            >
              <View style={st.attachIcon}>
                <Smile color="#f59e0b" size={22} />
              </View>
              <Text style={st.attachLabel}>Sticker</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Input bar */}
      <View style={st.inputContainer}>
        <TouchableOpacity
          style={st.iconBtn}
          onPress={() => { setShowAttachMenu((v) => !v); setShowStickers(false); }}
        >
          <Paperclip color={showAttachMenu ? Colors.primaryGreen : Colors.textSecondary} size={20} />
        </TouchableOpacity>

        <TextInput
          style={st.textInput}
          placeholder="Message..."
          placeholderTextColor={Colors.textSecondary}
          value={text}
          onChangeText={onChangeText}
          multiline
          maxLength={2000}
          onFocus={() => { setShowAttachMenu(false); setShowStickers(false); }}
        />

        {allowStickers && (
          <TouchableOpacity
            style={st.iconBtn}
            onPress={() => { setShowStickers((v) => !v); setShowAttachMenu(false); }}
          >
            <Smile color={showStickers ? Colors.primaryGreen : Colors.textSecondary} size={20} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[st.iconBtn, audio.isRecording && st.iconBtnRecording]}
          onPress={handleMicPress}
        >
          {audio.isRecording
            ? <StopCircle color={Colors.primaryGreen} size={22} />
            : <Mic color={audio.isAvailable ? Colors.textSecondary : Colors.border} size={20} />}
        </TouchableOpacity>

        {sending ? (
          <View style={[st.sendBtn, st.sendBtnActive]}>
            <ActivityIndicator color="#000" size="small" />
          </View>
        ) : (
          <TouchableOpacity
            style={[st.sendBtn, text.trim() && st.sendBtnActive]}
            onPress={onSendText}
            disabled={!text.trim()}
          >
            <Send color={text.trim() ? '#000' : Colors.textSecondary} size={18} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sticker picker */}
      {allowStickers && (
        <StickerPicker
          visible={showStickers}
          onSelect={handleStickerSelect}
          onClose={() => setShowStickers(false)}
        />
      )}
    </>
  );
}

const st = StyleSheet.create({
  recordingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.secondaryBg,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  recordingText: { flex: 1, color: Colors.white, fontSize: 14 },

  attachMenu: {
    flexDirection: 'row', gap: 16, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.secondaryBg,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  attachOption: { alignItems: 'center', gap: 6 },
  attachIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  attachLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },

  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: Colors.secondaryBg,
    borderTopWidth: 1, borderTopColor: Colors.border, gap: 6,
  },
  iconBtn: { padding: 9, justifyContent: 'center', alignItems: 'center' },
  iconBtnRecording: { opacity: 0.8 },
  textInput: {
    flex: 1, backgroundColor: Colors.cardBg,
    borderRadius: 22, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.white, fontSize: 14, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.cardBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtnActive: { backgroundColor: Colors.primaryGreen, borderColor: Colors.primaryGreen },
});