import { Colors } from '@/constants/colors';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { notificationService } from '@/data_api/services/notificationService';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Bell, ChevronLeft, ImagePlus, Send, Users, X } from 'lucide-react-native';
import { useState } from 'react';
import { InfoModal } from '@/components/infomodal';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminNotificationsScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const sendBroadcast = async () => {
    if (sending) return;
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle || !cleanBody) {
      setFeedback({
        type: 'warning',
        title: 'Message incomplet',
        message: 'Renseignez le titre et le message avant de lancer la diffusion.',
      });
      return;
    }

    setSending(true);
    try {
      const imageUrl = image
        ? await notificationService.uploadImage({
            uri: image.uri,
            name: image.fileName || `notification-${Date.now()}.jpg`,
            type: image.mimeType || 'image/jpeg',
          })
        : undefined;
      const result = await notificationService.broadcastToAll({ title: cleanTitle, body: cleanBody, imageUrl });
      const deliveryIssue = result.failedCount > 0 || result.deliveredCount === 0;
      setFeedback({
        type: deliveryIssue ? 'warning' : 'success',
        title: deliveryIssue ? 'Notification enregistrée' : 'Notification envoyée',
        message: deliveryIssue
          ? 'La notification a été enregistrée, mais la diffusion n’a pas pu aboutir complètement.'
          : 'Votre notification a bien été envoyée.',
      });
      setTitle('');
      setBody('');
      setImage(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Envoi impossible',
        message: getApiErrorMessage(error),
      });
    } finally {
      setSending(false);
    }
  };

  const chooseImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled) setImage(result.assets[0] ?? null);
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Image indisponible',
        message: getApiErrorMessage(error),
      });
    }
  };

  const confirmSend = () => {
    if (!title.trim() || !body.trim()) {
      setFeedback({
        type: 'warning',
        title: 'Message incomplet',
        message: 'Renseignez le titre et le message avant de lancer la diffusion.',
      });
      return;
    }
    setConfirmVisible(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Retour">
          <ChevronLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Bell color="#A78BFA" size={18} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Notifications push</Text>
          <Text style={styles.headerSubtitle}>Diffusion à tous les utilisateurs</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.audienceCard}>
          <View style={styles.audienceIcon}>
            <Users color="#A78BFA" size={19} />
          </View>
          <View style={styles.audienceText}>
            <Text style={styles.audienceTitle}>Tous les utilisateurs</Text>
            <Text style={styles.audienceSubtitle}>Appareils actifs avec notifications autorisées</Text>
          </View>
        </View>

        <Text style={styles.label}>Titre</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex. Nouvelle offre disponible"
          placeholderTextColor={Colors.textSecondary}
          maxLength={100}
          editable={!sending}
        />
        <Text style={styles.counter}>{title.length}/100</Text>

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={body}
          onChangeText={setBody}
          placeholder="Écrivez le message à envoyer…"
          placeholderTextColor={Colors.textSecondary}
          maxLength={500}
          multiline
          textAlignVertical="top"
          editable={!sending}
        />
        <Text style={styles.counter}>{body.length}/500</Text>

        <Text style={styles.label}>Image (facultative)</Text>
        {image ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setImage(null)} disabled={sending} accessibilityLabel="Retirer l’image">
              <X color={Colors.white} size={17} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePickerButton} onPress={chooseImage} disabled={sending}>
            <ImagePlus color="#A78BFA" size={18} />
            <Text style={styles.imagePickerText}>Ajouter une image</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={confirmSend}
          disabled={sending}
          activeOpacity={0.8}
        >
          {sending ? <ActivityIndicator color="#171321" /> : <Send color="#171321" size={17} />}
          <Text style={styles.sendButtonText}>{sending ? 'Envoi en cours…' : 'Envoyer la notification'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <InfoModal
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        onConfirm={() => { void sendBroadcast(); }}
        type="warning"
        title="Envoyer à tous les utilisateurs ?"
        message="Le message sera ajouté à l’historique et transmis aux appareils actifs."
        confirmText="Envoyer"
        secondaryText="Annuler"
        onSecondary={() => setConfirmVisible(false)}
      />
      <InfoModal
        visible={!!feedback}
        onClose={() => setFeedback(null)}
        type={feedback?.type ?? 'info'}
        title={feedback?.title ?? ''}
        message={feedback?.message}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.secondaryBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { padding: 3 },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(167,139,250,0.12)',
  },
  headerText: { flex: 1 },
  headerTitle: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  content: { padding: 20 },
  audienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    backgroundColor: 'rgba(167,139,250,0.07)',
    marginBottom: 26,
  },
  audienceIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.13)',
  },
  audienceText: { flex: 1, gap: 3 },
  audienceTitle: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  audienceSubtitle: { color: Colors.textSecondary, fontSize: 11, lineHeight: 16 },
  label: { color: Colors.white, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    color: Colors.white,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
  },
  messageInput: { minHeight: 140, maxHeight: 240 },
  imagePickerButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', backgroundColor: 'rgba(167,139,250,0.08)', marginBottom: 20 },
  imagePickerText: { color: '#C4B5FD', fontWeight: '700', fontSize: 12 },
  imagePreviewWrap: { height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 20, position: 'relative' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageButton: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.65)' },
  counter: { color: Colors.textSecondary, textAlign: 'right', fontSize: 10, marginTop: 5, marginBottom: 20 },
  sendButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#A78BFA',
    borderRadius: 12,
    marginTop: 8,
  },
  sendButtonDisabled: { opacity: 0.65 },
  sendButtonText: { color: '#171321', fontSize: 13, fontWeight: '800' },
});
