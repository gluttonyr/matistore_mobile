import { Colors } from '@/constants/colors';
import { User as UserModel, UserRole } from '@/data_api/models/user.types';
import { userService } from '@/data_api/services/userService';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { useFileUrl } from '@/hooks/useFileUrl';
import { SocialLinks } from '@/components/SocialLinks';
import { authStorage } from '@/storage/authStorage';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Check, ChevronRight, Edit3, ImagePlus, LogOut, Mail, Phone, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

// ─── Avatar initiales ────────────────────────────────────────────────────────
function AvatarInitials({
  prenom,
  nom,
  imageUri,
  onPress,
  disabled,
}: {
  prenom: string;
  nom: string;
  imageUri?: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const initials = `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();
  return (
    <TouchableOpacity
      style={styles.avatarContainer}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Modifier la photo de profil"
      hitSlop={8}
    >
      <View style={styles.avatarRing}>
        <LinearGradient
          colors={[Colors.primaryGreen, Colors.secondaryGreen ?? '#4caf50']}
          style={styles.avatarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {imageUri
            ? <Image source={{ uri: imageUri }} style={styles.avatarImage} />
            : <Text style={styles.avatarText}>{initials}</Text>}
        </LinearGradient>
      </View>
      <View pointerEvents="none" style={styles.avatarEditButton}>
        <ImagePlus color="#000" size={21} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Badge rôle ──────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#FF6B6B',
  VENDEUR: '#FFD93D',
  AFFILIER: '#6BCB77',
  USER: Colors.primaryGreen,
};

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? Colors.primaryGreen;
  return (
    <View style={[styles.roleBadge, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <View style={[styles.roleDot, { backgroundColor: color }]} />
      <Text style={[styles.roleText, { color }]}>{role}</Text>
    </View>
  );
}

// ─── Champ éditable ──────────────────────────────────────────────────────────
interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  editable: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
}

function EditableField({
  label, value, onChange, icon, editable,
  keyboardType = 'default', autoCapitalize = 'words',
}: EditableFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldWrapper, editable && styles.fieldWrapperActive]}>
        <View style={styles.fieldIcon}>{icon}</View>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChange}
          editable={editable}
          placeholderTextColor={Colors.textSecondary}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          selectTextOnFocus={editable}
        />
        {editable && (
          <View style={styles.editingDot} />
        )}
      </View>
    </View>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const profileImageUri = useFileUrl('profiles', user?.image);

    // const user = {
    //   nom:"John",
    //   prenom:"Doh",
    //   email:"johndoh@gmail.com",
    //   telephone:"+22890453454",
    //   role:UserRole.USER,
    //   active:true
    // } as UserModel
    // const logout = () => {}

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [nom, setNom] = useState(user?.nom ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [telephone, setTelephone] = useState(user?.telephone ?? '');
  const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const hasChanges =
    prenom !== user?.prenom ||
    nom !== user?.nom ||
    email !== user?.email ||
    telephone !== user?.telephone ||
    pickedImage !== null;

  const handleCancel = () => {
    setPrenom(user?.prenom ?? '');
    setNom(user?.nom ?? '');
    setEmail(user?.email ?? '');
    setTelephone(user?.telephone ?? '');
    setPickedImage(null);
    setIsEditing(false);
  };

  const chooseProfileImage = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission requise', text2: 'Autorisez l’accès à la galerie pour choisir une photo.' });
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible d’ouvrir la galerie de photos.' });
    }
    return null;
  };

  const saveProfileImage = async (image: ImagePicker.ImagePickerAsset) => {
    if (!user?.trackingId) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('data', JSON.stringify({}));
      formData.append('file', {
        uri: image.uri,
        name: image.fileName ?? image.uri.split('/').pop() ?? `profile_${Date.now()}.jpg`,
        type: image.mimeType ?? 'image/jpeg',
      } as any);
      const updatedUser = await userService.update(user.trackingId, formData);
      queryClient.setQueryData(['user'], updatedUser);
      await authStorage.setUser(updatedUser);
      Toast.show({ type: 'success', text1: 'Photo mise à jour', text2: 'Votre photo de profil a été enregistrée.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de mettre à jour la photo de profil.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarPress = async () => {
    const image = await chooseProfileImage();
    if (!image) return;

    if (isEditing) {
      setPickedImage(image);
      return;
    }
    await saveProfileImage(image);
  };

  const handleSave = async () => {
    if (!user?.trackingId) return;
    if (!prenom || !nom || !email) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Veuillez remplir tous les champs.' });
      return;
    }
    if (!email.includes('@')) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Adresse email invalide.' });
      return;
    }

    try {
      setLoading(true);
      const profileData = { prenom, nom, email, telephone };
      let updateData: FormData | typeof profileData = profileData;
      if (pickedImage) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(profileData));
        const name = pickedImage.fileName ?? pickedImage.uri.split('/').pop() ?? `profile_${Date.now()}.jpg`;
        formData.append('file', {
          uri: pickedImage.uri,
          name,
          type: pickedImage.mimeType ?? 'image/jpeg',
        } as any);
        updateData = formData;
      }
      const updatedUser = await userService.update(user.trackingId, updateData);
      queryClient.setQueryData(['user'], updatedUser);
      await authStorage.setUser(updatedUser);
      setPickedImage(null);
      Toast.show({ type: 'success', text1: 'Profil mis à jour', text2: 'Vos informations ont été enregistrées.' });
      setIsEditing(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de mettre à jour le profil.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primaryGreen} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['rgba(125,255,42,0.07)', Colors.darkBg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.35 }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Mon profil</Text>

          {!isEditing ? (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.8}>
              <Edit3 color={Colors.primaryGreen} size={16} />
              <Text style={styles.editBtnText}>Modifier</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                <X color={Colors.textSecondary} size={16} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!hasChanges || loading) && styles.saveBtnDisabled]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={!hasChanges || loading}
              >
                {loading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Check color="#000" size={16} />
                }
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Avatar + identité ── */}
        <View style={styles.heroCard}>
          <AvatarInitials
            prenom={prenom}
            nom={nom}
            imageUri={isEditing ? pickedImage?.uri ?? profileImageUri : profileImageUri}
            onPress={() => void handleAvatarPress()}
            disabled={loading}
          />

          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{prenom} {nom}</Text>
            <Text style={styles.heroUsername}>@{user.username ?? user.email.split('@')[0]}</Text>
            <RoleBadge role={user.role} />
          </View>
        </View>

        {/* ── Statut compte ── */}
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, user.active ? styles.statusActive : styles.statusInactive]}>
            <View style={[styles.statusDot, { backgroundColor: user.active ? '#6BCB77' : '#FF6B6B' }]} />
            <Text style={[styles.statusText, { color: user.active ? '#6BCB77' : '#FF6B6B' }]}>
              {user.active ? 'Compte actif' : 'Compte inactif'}
            </Text>
          </View>
          <Text style={styles.memberSince}>
            Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* ── Section informations ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>

          <EditableField
            label="Prénom"
            value={prenom}
            onChange={setPrenom}
            icon={<User color={isEditing ? Colors.primaryGreen : Colors.textSecondary} size={17} />}
            editable={isEditing}
            autoCapitalize="words"
          />
          <EditableField
            label="Nom"
            value={nom}
            onChange={setNom}
            icon={<User color={isEditing ? Colors.primaryGreen : Colors.textSecondary} size={17} />}
            editable={isEditing}
            autoCapitalize="words"
          />
          <EditableField
            label="Email"
            value={email}
            onChange={setEmail}
            icon={<Mail color={isEditing ? Colors.primaryGreen : Colors.textSecondary} size={17} />}
            editable={isEditing}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <EditableField
            label="Téléphone"
            value={telephone}
            onChange={setTelephone}
            icon={<Phone color={isEditing ? Colors.primaryGreen : Colors.textSecondary} size={17} />}
            editable={isEditing}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>

        {/* ── Séparateur ── */}
        <View style={styles.separator} />

        {/* ── Déconnexion ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
          <LogOut color="#FF6B6B" size={18} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
          <ChevronRight color="#FF6B6B" size={16} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <SocialLinks variant="contact" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: Colors.darkBg, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
  },
  pageTitle: { color: Colors.white, fontSize: 26, fontWeight: '800', letterSpacing: 0.4 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(125,255,42,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editBtnText: { color: Colors.primaryGreen, fontSize: 13, fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryGreen,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },

  // Hero
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    padding: 3,
    backgroundColor: 'rgba(125,255,42,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(125,255,42,0.35)',
  },
  avatarContainer: { position: 'relative' },
  avatarGradient: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 32 },
  avatarEditButton: {
    position: 'absolute',
    right: -7,
    bottom: -7,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryGreen,
    borderWidth: 2,
    borderColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#000', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { color: Colors.white, fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
  heroUsername: { color: Colors.textSecondary, fontSize: 13 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 28,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusActive: { borderColor: 'rgba(107,203,119,0.3)', backgroundColor: 'rgba(107,203,119,0.1)' },
  statusInactive: { borderColor: 'rgba(255,107,107,0.3)', backgroundColor: 'rgba(255,107,107,0.1)' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  memberSince: { color: Colors.textSecondary, fontSize: 12 },

  // Section
  section: { paddingHorizontal: 24, marginBottom: 8 },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Champs
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  fieldWrapperActive: {
    borderColor: Colors.primaryGreen,
    backgroundColor: 'rgba(125,255,42,0.04)',
  },
  fieldIcon: { marginRight: 10 },
  fieldInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    paddingVertical: 13,
  },
  editingDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.primaryGreen,
    marginLeft: 6,
  },

  // Séparateur
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 24,
    marginVertical: 20,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,107,107,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  logoutText: { color: '#FF6B6B', fontSize: 15, fontWeight: '700' },
});
