import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, ChevronLeft, ChevronDown, ImagePlus, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Categorie } from '@/data_api/models/categorie.types';
import { categorieService } from '@/data_api/services/categorieService';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { useFileUrl } from '@/hooks/useFileUrl';
import DatePickerModal from '@/components/ui/DatePickerModal';

export type EventFormValues = {
  titre: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  lieu?: string;
  categorieTrackingId: string;
};

export type EventFormInitialValues = {
  titre?: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  lieu?: string | null;
  categorieId?: string | null;
  coverImage?: string | null;
};

type PickedFile = { uri: string; name: string; type: string };

type Props = {
  initialValues?: EventFormInitialValues;
  onSubmit: (values: EventFormValues, file?: PickedFile) => Promise<void>;
  onBack: () => void;
  mode: 'create' | 'edit';
};

function formatDatePretty(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function EventForm({ initialValues, onSubmit, onBack, mode }: Props) {
  const [titre, setTitre] = useState(initialValues?.titre ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [dateDebut, setDateDebut] = useState(initialValues?.dateDebut ?? '');
  const [dateFin, setDateFin] = useState(initialValues?.dateFin ?? '');
  const [lieu, setLieu] = useState(initialValues?.lieu ?? '');
  const [categorieTrackingId, setCategorieTrackingId] = useState(initialValues?.categorieId ?? '');
  const [pickedImage, setPickedImage] = useState<PickedFile | null>(null);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showDateDebutPicker, setShowDateDebutPicker] = useState(false);
  const [showDateFinPicker, setShowDateFinPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const existingImageUrl = useFileUrl('events', initialValues?.coverImage);
  const previewUri = pickedImage?.uri ?? existingImageUrl;

  useEffect(() => {
    categorieService
      .getAll()
      .then((data) => {
        setCategories(data);
        if (!categorieTrackingId && data.length > 0) {
          setCategorieTrackingId(data[0].trackingId);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Sélection depuis la galerie ---
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission refusée. Autorisez l\'accès à la galerie dans les paramètres.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? `event_${Date.now()}.jpg`;
      const type = asset.mimeType ?? 'image/jpeg';
      setPickedImage({ uri: asset.uri, name, type });
      setErrors((p) => ({ ...p, image: '' }));
    }
  };

  // --- Prise de photo ---
  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission refusée. Autorisez l\'accès à la caméra dans les paramètres.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? `event_${Date.now()}.jpg`;
      const type = asset.mimeType ?? 'image/jpeg';
      setPickedImage({ uri: asset.uri, name, type });
      setErrors((p) => ({ ...p, image: '' }));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!titre.trim()) e.titre = 'Le titre est requis';
    if (!description.trim()) e.description = 'La description est requise';
    if (!dateDebut || isNaN(new Date(dateDebut).getTime())) e.dateDebut = 'Sélectionnez une date de début';
    if (!dateFin || isNaN(new Date(dateFin).getTime())) e.dateFin = 'Sélectionnez une date de fin';
    if (
      !e.dateDebut && !e.dateFin &&
      new Date(dateFin).getTime() < new Date(dateDebut).getTime()
    ) e.dateFin = 'La date de fin doit être après la date de début';
    if (!categorieTrackingId) e.categorie = 'Choisissez une catégorie';
    if (!pickedImage && !initialValues?.coverImage) e.image = 'Une image est requise';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await onSubmit(
        {
          titre: titre.trim(),
          description: description.trim(),
          dateDebut,
          dateFin,
          lieu: lieu.trim() || undefined,
          categorieTrackingId,
        },
        pickedImage ?? undefined,
      );
    } catch (err) {
      setErrors((p) => ({ ...p, submit: getApiErrorMessage(err) }));
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = mode === 'edit';
  const selectedCategory = categories.find((c) => c.trackingId === categorieTrackingId);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.darkBg }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient colors={[Colors.secondaryBg, Colors.darkBg]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft color={Colors.white} size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {isEdit ? 'Modifier l\'événement' : 'Nouvel événement'}
          </Text>
          <Text style={styles.headerSub}>
            {isEdit ? 'Mettez à jour les informations' : 'Remplissez les informations ci-dessous'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Image Upload ── */}
        <Field label="Image de l'événement" error={errors.image}>
          {previewUri ? (
            // Aperçu de l'image sélectionnée
            <View style={styles.previewContainer}>
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
              <LinearGradient
                colors={['transparent', 'rgba(5,5,5,0.6)']}
                style={StyleSheet.absoluteFill}
              />
              {/* Bouton supprimer (uniquement pour une image nouvellement choisie) */}
              {pickedImage && (
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setPickedImage(null)}
                >
                  <X color={Colors.white} size={16} strokeWidth={3} />
                </TouchableOpacity>
              )}
              {/* Bouton changer */}
              <View style={styles.changeImageRow}>
                <TouchableOpacity style={styles.changeImageBtn} onPress={pickFromGallery}>
                  <Text style={styles.changeImageText}>Changer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Zone de drop / sélection
            <View style={[styles.uploadZone, errors.image && styles.uploadZoneError]}>
              <ImagePlus color={errors.image ? '#ff4d4d' : Colors.primaryGreen} size={32} strokeWidth={1.5} />
              <Text style={styles.uploadTitle}>Ajouter une image</Text>
              <Text style={styles.uploadSub}>Format recommandé : 16/9 · JPG ou PNG</Text>
              <View style={styles.uploadBtns}>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickFromGallery}>
                  <LinearGradient
                    colors={[Colors.primaryGreen, Colors.secondaryGreen]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                  <Text style={styles.uploadBtnText}>Galerie</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadBtnOutline} onPress={pickFromCamera}>
                  <Text style={styles.uploadBtnOutlineText}>Caméra</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Field>

        {/* Title */}
        <Field label="Titre de l'événement" error={errors.titre}>
          <TextInput
            style={[styles.input, errors.titre && styles.inputError]}
            placeholder="Ex: Tournoi de Pâques 2025"
            placeholderTextColor={Colors.textSecondary}
            value={titre}
            onChangeText={(v) => { setTitre(v); setErrors((p) => ({ ...p, titre: '' })); }}
          />
        </Field>

        {/* Description */}
        <Field label="Description" error={errors.description}>
          <TextInput
            style={[styles.input, styles.textarea, errors.description && styles.inputError]}
            placeholder="Décrivez l'événement en détail…"
            placeholderTextColor={Colors.textSecondary}
            value={description}
            onChangeText={(v) => { setDescription(v); setErrors((p) => ({ ...p, description: '' })); }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>

        {/* Dates */}
        <Field label="Date de début" error={errors.dateDebut}>
          <TouchableOpacity
            style={[styles.input, styles.dateInput, errors.dateDebut && styles.inputError]}
            onPress={() => setShowDateDebutPicker(true)}
          >
            <Calendar color={Colors.primaryGreen} size={16} />
            <Text style={dateDebut ? styles.dateInputText : styles.dateInputPlaceholder}>
              {dateDebut ? formatDatePretty(dateDebut) : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
        </Field>

        <Field label="Date de fin" error={errors.dateFin}>
          <TouchableOpacity
            style={[styles.input, styles.dateInput, errors.dateFin && styles.inputError]}
            onPress={() => setShowDateFinPicker(true)}
          >
            <Calendar color={Colors.primaryGreen} size={16} />
            <Text style={dateFin ? styles.dateInputText : styles.dateInputPlaceholder}>
              {dateFin ? formatDatePretty(dateFin) : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
        </Field>

        <DatePickerModal
          visible={showDateDebutPicker}
          value={dateDebut}
          title="Date de début"
          onClose={() => setShowDateDebutPicker(false)}
          onSelect={(iso) => {
            setDateDebut(iso);
            setErrors((p) => ({ ...p, dateDebut: '' }));
            // Si la date de fin devient antérieure à la nouvelle date de début, on la réinitialise
            if (dateFin && new Date(dateFin).getTime() < new Date(iso).getTime()) {
              setDateFin('');
            }
          }}
        />

        <DatePickerModal
          visible={showDateFinPicker}
          value={dateFin}
          minimumDate={dateDebut ? new Date(dateDebut) : undefined}
          title="Date de fin"
          onClose={() => setShowDateFinPicker(false)}
          onSelect={(iso) => {
            setDateFin(iso);
            setErrors((p) => ({ ...p, dateFin: '' }));
          }}
        />

        {/* Location */}
        <Field label="Lieu (optionnel)">
          <TextInput
            style={styles.input}
            placeholder="Ex: MATI STORE - Lomé"
            placeholderTextColor={Colors.textSecondary}
            value={lieu}
            onChangeText={setLieu}
          />
        </Field>

        {/* Category */}
        <Field label="Catégorie" error={errors.categorie}>
          {loadingCategories ? (
            <ActivityIndicator color={Colors.primaryGreen} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowCatPicker((p) => !p)}
                disabled={categories.length === 0}
              >
                <Text style={styles.pickerText}>
                  {selectedCategory?.libelle ?? 'Aucune catégorie disponible'}
                </Text>
                <ChevronDown
                  color={Colors.textSecondary}
                  size={18}
                  style={{ transform: [{ rotate: showCatPicker ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>
              {showCatPicker && (
                <View style={styles.pickerDropdown}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.trackingId}
                      style={[styles.pickerOption, cat.trackingId === categorieTrackingId && styles.pickerOptionActive]}
                      onPress={() => {
                        setCategorieTrackingId(cat.trackingId);
                        setErrors((p) => ({ ...p, categorie: '' }));
                        setShowCatPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, cat.trackingId === categorieTrackingId && styles.pickerOptionTextActive]}>
                        {cat.libelle}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </Field>

        {!!errors.submit && <Text style={styles.errorText}>{errors.submit}</Text>}

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          <LinearGradient
            colors={[Colors.primaryGreen, Colors.secondaryGreen]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isEdit ? 'Enregistrer les modifications' : 'Créer l\'événement'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '900' },
  headerSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  form: { padding: 20, gap: 20, paddingBottom: 48 },
  field: { gap: 8 },
  label: { color: Colors.white, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  // ── Upload zone ──
  uploadZone: {
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(125,255,42,0.25)',
    borderStyle: 'dashed', backgroundColor: 'rgba(125,255,42,0.04)',
    alignItems: 'center', paddingVertical: 32, gap: 8,
  },
  uploadZoneError: { borderColor: 'rgba(255,77,77,0.4)', backgroundColor: 'rgba(255,77,77,0.04)' },
  uploadTitle: { color: Colors.white, fontSize: 15, fontWeight: '700', marginTop: 4 },
  uploadSub: { color: Colors.textSecondary, fontSize: 12 },
  uploadBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  uploadBtn: {
    overflow: 'hidden', borderRadius: 10,
    paddingHorizontal: 22, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
  uploadBtnOutline: {
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 22, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.cardBg,
  },
  uploadBtnOutlineText: { color: Colors.white, fontSize: 13, fontWeight: '700' },

  // ── Preview ──
  previewContainer: {
    borderRadius: 16, overflow: 'hidden', height: 180,
    borderWidth: 1, borderColor: Colors.border,
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  changeImageRow: {
    position: 'absolute', bottom: 10, right: 10,
  },
  changeImageBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  changeImageText: { color: Colors.white, fontSize: 12, fontWeight: '700' },

  // ── Inputs ──
  input: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    color: Colors.white, fontSize: 14,
  },
  inputError: { borderColor: '#ff4d4d' },
  textarea: { minHeight: 100 },
  errorText: { color: '#ff4d4d', fontSize: 12, fontWeight: '600', marginTop: -4 },

  dateInput: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateInputText: { color: Colors.white, fontSize: 14 },
  dateInputPlaceholder: { color: Colors.textSecondary, fontSize: 14 },

  picker: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerText: { color: Colors.white, fontSize: 14 },
  pickerDropdown: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, marginTop: -8, overflow: 'hidden',
  },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 13 },
  pickerOptionActive: { backgroundColor: 'rgba(125,255,42,0.1)' },
  pickerOptionText: { color: Colors.textSecondary, fontSize: 14 },
  pickerOptionTextActive: { color: Colors.primaryGreen, fontWeight: '700' },

  submitBtn: {
    height: 52, borderRadius: 14,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  submitBtnText: { color: '#000', fontSize: 15, fontWeight: '900' },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
