/**
 * /config/slide-editor.tsx
 *
 * Admin screen to manage the home hero slider (bannières), backed by the
 * banniere backend module.
 * - View all slides as editable cards
 * - Change image (gallery picker via expo-image-picker)
 * - Edit title, subtitle, CTA button text, CTA link/route
 * - Reorder (move up / move down)
 * - Delete a slide
 * - Add a new slide
 */

import { Colors } from '@/constants/colors';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { banniereService } from '@/data_api/services/banniereService';
import { useFileUrl } from '@/hooks/useFileUrl';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Image as ImageIcon,
    Link,
    Plus,
    Trash2,
    Type,
    X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

type PickedFile = { uri: string; name: string; type: string };

interface SlideDraft {
  id: string; // trackingId réel, ou id temporaire `draft-...` si pas encore créé
  isNew: boolean;
  image: string | null; // nom de fichier existant côté backend
  pickedImage: PickedFile | null; // nouvelle image locale pas encore uploadée
  title: string;
  subtitle: string;
  cta: string;
  link: string; // internal route or external URL
}

// ─── Link presets (common internal routes) ─────────────────────────────────────

const LINK_PRESETS = [
  { label: 'Dépôt', value: '/user_chats/deposit-withdrawal?initialMode=deposit' },
  { label: 'Retrait', value: '/user_chats/deposit-withdrawal?initialMode=withdrawal' },
  { label: 'Forum', value: '/(tabs)/forum' },
  { label: 'Événements', value: '/(tabs)/events' },
  { label: 'Profil', value: '/(tabs)/profile' },
  { label: 'Lien externe (site web, etc.)…', value: '__custom__' },
];

// ─── Composant image (respecte les règles des hooks dans une liste) ───────────

function BannerImagePreview({
  pickedUri, image, style,
}: { pickedUri?: string | null; image?: string | null; style?: any }) {
  const remoteUri = useFileUrl('banners', image);
  const uri = pickedUri || remoteUri;
  if (!uri) return <View style={[style, { backgroundColor: Colors.border }]} />;
  return <Image source={{ uri }} style={style} resizeMode="cover" />;
}

// ─── Helper: clone deep ────────────────────────────────────────────────────────

const cloneSlides = (slides: SlideDraft[]): SlideDraft[] =>
  slides.map((s) => ({ ...s }));

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SlideEditorScreen() {
  const params = useLocalSearchParams<{ focusId?: string; addNew?: string }>();

  const [slides, setSlides] = useState<SlideDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(
    params.focusId ?? null
  );
  const [saved, setSaved] = useState(false);
  const [linkPickerSlideId, setLinkPickerSlideId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await banniereService.getAll();
      setSlides(
        data.map((b) => ({
          id: b.trackingId,
          isNew: false,
          image: b.image ?? null,
          pickedImage: null,
          title: b.titre,
          subtitle: b.sousTitre ?? '',
          cta: b.texteCta ?? '',
          link: b.lien ?? '',
        }))
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && params.addNew === 'true') handleAddSlide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ── Slide mutations ──────────────────────────────────────────────────────────

  const updateSlide = (id: string, patch: Partial<SlideDraft>) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const deleteSlide = (id: string) => {
    const slide = slides.find((s) => s.id === id);
    Alert.alert('Supprimer la bannière', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          if (slide && !slide.isNew) {
            try {
              await banniereService.remove(slide.id);
            } catch (err) {
              Alert.alert('Erreur', getApiErrorMessage(err));
              return;
            }
          }
          setSlides((prev) => prev.filter((s) => s.id !== id));
          if (expandedId === id) setExpandedId(null);
        },
      },
    ]);
  };

  const moveSlide = (id: string, dir: 'up' | 'down') => {
    setSlides((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (
        (dir === 'up' && idx === 0) ||
        (dir === 'down' && idx === prev.length - 1)
      )
        return prev;
      const next = cloneSlides(prev);
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleAddSlide = () => {
    const newId = `draft-${Date.now()}`;
    const newSlide: SlideDraft = {
      id: newId,
      isNew: true,
      image: null,
      pickedImage: null,
      title: 'Nouveau titre',
      subtitle: 'Sous-titre ici',
      cta: 'Découvrir',
      link: '',
    };
    setSlides((prev) => [...prev, newSlide]);
    setExpandedId(newId);
  };

  // ── Image picker ─────────────────────────────────────────────────────────────

  const pickImage = async (slideId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "Autorisez l'accès à la galerie dans les réglages de votre téléphone."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 7],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? `banner_${Date.now()}.jpg`;
      const type = asset.mimeType ?? 'image/jpeg';
      updateSlide(slideId, { pickedImage: { uri: asset.uri, name, type } });
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (slides.some((s) => !s.title.trim())) {
      Alert.alert('Titre requis', 'Chaque bannière doit avoir un titre.');
      return;
    }
    setSaving(true);
    try {
      const persisted = await Promise.all(
        slides.map(async (slide) => {
          const dto = {
            titre: slide.title.trim(),
            sousTitre: slide.subtitle.trim() || undefined,
            texteCta: slide.cta.trim() || undefined,
            lien: slide.link.trim() || undefined,
          };
          if (slide.isNew) {
            const created = await banniereService.create(dto, slide.pickedImage ?? undefined);
            return { ...slide, id: created.trackingId, image: created.image ?? null, isNew: false, pickedImage: null };
          }
          const updated = await banniereService.update(slide.id, dto, slide.pickedImage ?? undefined);
          return { ...slide, image: updated.image ?? null, pickedImage: null };
        })
      );
      await banniereService.reorder(persisted.map((s) => s.id));
      setSlides(persisted);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.back();
      }, 1200);
    } catch (err) {
      Alert.alert('Erreur', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Link picker modal ────────────────────────────────────────────────────────

  const handleLinkPreset = (slideId: string, value: string) => {
    if (value !== '__custom__') {
      updateSlide(slideId, { link: value });
      setLinkPickerSlideId(null);
    } else {
      // Keep modal open; user will type in the TextInput
      updateSlide(slideId, { link: '' });
      setLinkPickerSlideId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <LinearGradient colors={[Colors.secondaryBg, Colors.darkBg]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.white} size={20} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Bannières home</Text>
          <Text style={styles.headerSub}>{slides.length} slide{slides.length > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnDone]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving || loading}
        >
          {saved ? (
            <CheckCircle color="#000" size={16} />
          ) : saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={Colors.primaryGreen} size="large" />
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
        >

          {/* ── Info banner ── */}
          <Animated.View style={[styles.infoBanner, { opacity: fadeAnim }]}>
            <Text style={styles.infoBannerText}>
              Les modifications s'appliquent à l'accueil de tous les utilisateurs. Utilisez les flèches pour réordonner, puis "Enregistrer" pour publier.
            </Text>
          </Animated.View>

          {/* ── Slide cards ── */}
          {slides.map((slide, index) => {
            const isExpanded = expandedId === slide.id;
            return (
              <Animated.View
                key={slide.id}
                style={[styles.slideCard, { opacity: fadeAnim }]}
              >
                {/* Card header — always visible */}
                <TouchableOpacity
                  style={styles.slideCardHeader}
                  onPress={() =>
                    setExpandedId(isExpanded ? null : slide.id)
                  }
                  activeOpacity={0.8}
                >
                  {/* Thumbnail */}
                  <BannerImagePreview
                    pickedUri={slide.pickedImage?.uri}
                    image={slide.image}
                    style={styles.slideThumbnail}
                  />

                  <View style={styles.slideCardHeaderInfo}>
                    <Text style={styles.slideCardIndex}>
                      Bannière {index + 1}
                    </Text>
                    <Text style={styles.slideCardTitle} numberOfLines={1}>
                      {slide.title}
                    </Text>
                    <View style={styles.slideCardCTAChip}>
                      <Text style={styles.slideCardCTAText}>{slide.cta}</Text>
                    </View>
                  </View>

                  <View style={styles.slideCardHeaderActions}>
                    {/* Reorder */}
                    <View style={styles.reorderCol}>
                      <TouchableOpacity
                        style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                        onPress={() => moveSlide(slide.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp
                          color={index === 0 ? Colors.border : Colors.textSecondary}
                          size={12}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.reorderBtn,
                          index === slides.length - 1 && styles.reorderBtnDisabled,
                        ]}
                        onPress={() => moveSlide(slide.id, 'down')}
                        disabled={index === slides.length - 1}
                      >
                        <ArrowDown
                          color={
                            index === slides.length - 1
                              ? Colors.border
                              : Colors.textSecondary
                          }
                          size={12}
                        />
                      </TouchableOpacity>
                    </View>

                    <ChevronDown
                      color={Colors.textSecondary}
                      size={16}
                      style={{
                        transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                      }}
                    />
                  </View>
                </TouchableOpacity>

                {/* ── Expanded edit panel ── */}
                {isExpanded && (
                  <View style={styles.slideEditPanel}>
                    {/* Image preview + change button */}
                    <View style={styles.imageSection}>
                      <BannerImagePreview
                        pickedUri={slide.pickedImage?.uri}
                        image={slide.image}
                        style={styles.imagePreview}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        style={styles.imagePreviewOverlay}
                      >
                        <TouchableOpacity
                          style={styles.changeImageBtn}
                          onPress={() => pickImage(slide.id)}
                          activeOpacity={0.85}
                        >
                          <ImageIcon color="#fff" size={15} />
                          <Text style={styles.changeImageBtnText}>
                            Changer l'image
                          </Text>
                        </TouchableOpacity>
                      </LinearGradient>
                    </View>

                    {/* Fields */}
                    <View style={styles.fieldsContainer}>

                      {/* Title */}
                      <View style={styles.fieldGroup}>
                        <View style={styles.fieldLabel}>
                          <Type color={Colors.textSecondary} size={12} />
                          <Text style={styles.fieldLabelText}>Titre</Text>
                        </View>
                        <TextInput
                          style={styles.fieldInput}
                          value={slide.title}
                          onChangeText={(v) => updateSlide(slide.id, { title: v })}
                          placeholderTextColor={Colors.textSecondary}
                          placeholder="Titre de la bannière"
                        />
                      </View>

                      {/* Subtitle */}
                      <View style={styles.fieldGroup}>
                        <View style={styles.fieldLabel}>
                          <Type color={Colors.textSecondary} size={12} />
                          <Text style={styles.fieldLabelText}>Sous-titre</Text>
                        </View>
                        <TextInput
                          style={styles.fieldInput}
                          value={slide.subtitle}
                          onChangeText={(v) => updateSlide(slide.id, { subtitle: v })}
                          placeholderTextColor={Colors.textSecondary}
                          placeholder="Description courte"
                          multiline
                        />
                      </View>

                      {/* CTA text */}
                      <View style={styles.fieldGroup}>
                        <View style={styles.fieldLabel}>
                          <ChevronRight color={Colors.primaryGreen} size={12} />
                          <Text style={[styles.fieldLabelText, { color: Colors.primaryGreen }]}>
                            Texte du bouton
                          </Text>
                        </View>
                        <TextInput
                          style={[styles.fieldInput, styles.fieldInputGreen]}
                          value={slide.cta}
                          onChangeText={(v) => updateSlide(slide.id, { cta: v })}
                          placeholderTextColor={Colors.textSecondary}
                          placeholder="Ex: Jouer maintenant"
                        />
                      </View>

                      {/* Link */}
                      <View style={styles.fieldGroup}>
                        <View style={styles.fieldLabelRow}>
                          <View style={styles.fieldLabel}>
                            <Link color="#38BDF8" size={12} />
                            <Text style={[styles.fieldLabelText, { color: '#38BDF8' }]}>
                              Lien / Destination
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.presetBtn}
                            onPress={() => setLinkPickerSlideId(slide.id)}
                          >
                            <Text style={styles.presetBtnText}>Choisir…</Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={[styles.fieldInput, styles.fieldInputBlue]}
                          value={slide.link}
                          onChangeText={(v) => updateSlide(slide.id, { link: v })}
                          placeholderTextColor={Colors.textSecondary}
                          placeholder="/(tabs)/events ou https://mon-site.com"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                        />
                        <Text style={styles.fieldHint}>
                          Commence par "/" pour ouvrir une page de l'app, ou par "http(s)://" pour ouvrir un lien externe dans le navigateur.
                        </Text>
                      </View>

                      {/* Delete */}
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => deleteSlide(slide.id)}
                        activeOpacity={0.8}
                      >
                        <Trash2 color="#F87171" size={14} />
                        <Text style={styles.deleteBtnText}>Supprimer cette bannière</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Animated.View>
            );
          })}

          {/* ── Add slide button ── */}
          <TouchableOpacity
            style={styles.addSlideBtn}
            onPress={handleAddSlide}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(167,139,250,0.15)', 'rgba(167,139,250,0.05)']}
              style={styles.addSlideBtnGrad}
            >
              <View style={styles.addSlideIconWrap}>
                <Plus color="#A78BFA" size={18} />
              </View>
              <Text style={styles.addSlideBtnText}>Ajouter une bannière</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      )}

      {/* ── Link preset picker modal ── */}
      <Modal
        transparent
        visible={!!linkPickerSlideId}
        animationType="slide"
        onRequestClose={() => setLinkPickerSlideId(null)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setLinkPickerSlideId(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHandle} />
              <Text style={styles.pickerTitle}>Choisir une destination</Text>
              {LINK_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  style={styles.pickerItem}
                  onPress={() => {
                    if (linkPickerSlideId)
                      handleLinkPreset(linkPickerSlideId, preset.value);
                  }}
                  activeOpacity={0.7}
                >
                  <ChevronRight color="#A78BFA" size={14} />
                  <Text style={styles.pickerItemText}>{preset.label}</Text>
                  {preset.value !== '__custom__' && (
                    <Text style={styles.pickerItemSub} numberOfLines={1}>
                      {preset.value}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.pickerCancelBtn}
                onPress={() => setLinkPickerSlideId(null)}
              >
                <X color={Colors.textSecondary} size={14} />
                <Text style={styles.pickerCancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  headerSub: { color: Colors.textSecondary, fontSize: 11, marginTop: 1 },
  saveBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDone: { backgroundColor: Colors.primaryGreen },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  // Loader / error
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  errorText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
  },
  retryBtnText: { color: '#A78BFA', fontWeight: '700' },

  // Info banner
  infoBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    padding: 12,
  },
  infoBannerText: {
    color: 'rgba(167,139,250,0.8)',
    fontSize: 12,
    lineHeight: 18,
  },

  // Slide card
  slideCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  slideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  slideThumbnail: {
    width: 70,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  slideCardHeaderInfo: { flex: 1, gap: 3 },
  slideCardIndex: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  slideCardTitle: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  slideCardCTAChip: {
    backgroundColor: 'rgba(125,255,42,0.12)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.2)',
  },
  slideCardCTAText: { color: Colors.primaryGreen, fontSize: 9, fontWeight: '700' },
  slideCardHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reorderCol: { gap: 2 },
  reorderBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reorderBtnDisabled: { opacity: 0.35 },

  // Edit panel
  slideEditPanel: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  imageSection: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 14,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  changeImageBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Fields
  fieldsContainer: { padding: 14, gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fieldLabelText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  fieldInput: {
    backgroundColor: Colors.secondaryBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.white,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldInputGreen: { borderColor: 'rgba(125,255,42,0.25)' },
  fieldInputBlue: { borderColor: 'rgba(56,189,248,0.25)' },
  fieldHint: { color: Colors.textSecondary, fontSize: 10, lineHeight: 14, marginTop: 2 },

  presetBtn: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  presetBtnText: { color: '#38BDF8', fontSize: 10, fontWeight: '700' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.07)',
    borderRadius: 10,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
    marginTop: 4,
  },
  deleteBtnText: { color: '#F87171', fontSize: 13, fontWeight: '700' },

  // Add slide
  addSlideBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(167,139,250,0.35)',
  },
  addSlideBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  addSlideIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(167,139,250,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlideBtnText: { color: '#A78BFA', fontSize: 14, fontWeight: '700' },

  // Link picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.secondaryBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 4,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  pickerTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemText: { color: Colors.white, fontSize: 14, fontWeight: '600', flex: 0 },
  pickerItemSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
  },
  pickerCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerCancelText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
});
