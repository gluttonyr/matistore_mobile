import GreenButton from '@/components/ui/GreenButton';
import { Colors } from '@/constants/colors';
import { authService } from '@/data_api/services/authService';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronLeft, Eye, EyeOff, Lock } from 'lucide-react-native';
import { useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View,
} from 'react-native';
import CountryPicker, {
  Country,
  CountryCode,
  DARK_THEME,
} from 'react-native-country-picker-modal';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';
import { consumePendingAppleIdentityToken } from '@/hooks/useAppleAuth';


export default function RegisterStep2() {
  const params = useLocalSearchParams();

  // Togo par défaut (pays de l'utilisateur)
  const [countryCode, setCountryCode] = useState<CountryCode>('TG');
  const [callingCode, setCallingCode] = useState('228');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fullTelephone = `+${callingCode}${phoneNumber}`;

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
    setShowPicker(false);
  };

  const handleCreate = async () => {
    try {
      if (!phoneNumber || !password || !confirm) {
        setError('Veuillez remplir tous les champs.');
        return;
      }
      if (password.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
      if (password !== confirm) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
      setError('');
      setLoading(true);
      await authService.register({
        prenom: params.prenom as string,
        nom: params.nom as string,
        username: `${params.nom} ${params.prenom}`.trim(),
        email: params.email as string,
        telephone: fullTelephone,
        password,
        ...(params.googleId ? { googleId: params.googleId as string, provider: 'google' } : {}),
        ...(params.appleId ? {
          appleId: params.appleId as string,
          provider: 'apple',
          identityToken: consumePendingAppleIdentityToken() ?? undefined,
        } : {}),
      });
      Toast.show({
        type: 'success',
        text1: 'Compte créé',
        text2: 'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.',
      });

      setLoading(false);
      router.replace('/(auth)/login');

    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Une erreur est survenue lors de la création du compte.';

      setError(message);

      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: message,
      });
      // Toast.show({
      //   type: 'error',
      //   text1: 'Erreur',
      //   text2: 'Une erreur est survenue lors de la création du compte. Veuillez réessayer.',
      // });
      setLoading(false);
      // setError(err.message);
    }

  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['rgba(125,255,42,0.05)', Colors.darkBg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft color={Colors.textSecondary} size={24} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Indicateur d'étape */}
          <View style={styles.stepIndicator}>
            <View style={[styles.step, styles.stepDone]}>
              <Text style={styles.stepDoneText}>✓</Text>
            </View>
            <View style={[styles.stepLine, styles.stepLineDone]} />
            <View style={[styles.step, styles.stepActive]}>
              <Text style={styles.stepActiveText}>2</Text>
            </View>
          </View>

          <Text style={styles.title}>Presque terminé !</Text>
          <Text style={styles.subtitle}>Sécurisez votre compte</Text>

          {params.prenom ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                {params.prenom} {params.nom} · {params.email}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Champ téléphone avec sélecteur de pays */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.inputWrapper}>
              {/* Bouton sélecteur pays */}
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
              >
                <CountryPicker
                  countryCode={countryCode}
                  withFlag
                  withEmoji
                  withFilter
                  withCallingCode
                  withAlphaFilter
                  theme={DARK_THEME}
                  onSelect={onSelectCountry}
                  visible={showPicker}
                  onClose={() => setShowPicker(false)}
                  // Le composant rend le drapeau inline, on le cache visuellement
                  // car on le déclenche via notre bouton
                  containerButtonStyle={styles.pickerHidden}
                />
                <Text style={styles.callingCodeText}>+{callingCode}</Text>
                <ChevronDown color={Colors.textSecondary} size={14} style={{ marginLeft: 2 }} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TextInput
                style={styles.phoneInput}
                placeholder="XX XX XX XX"
                placeholderTextColor={Colors.textSecondary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrapper}>
              <Lock color={Colors.textSecondary} size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputPad]}
                placeholder="Minimum 8 caractères"
                placeholderTextColor={Colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(!showPwd)}>
                {showPwd
                  ? <EyeOff color={Colors.textSecondary} size={18} />
                  : <Eye color={Colors.textSecondary} size={18} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmation mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.inputWrapper}>
              <Lock color={Colors.textSecondary} size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputPad]}
                placeholder="Répéter le mot de passe"
                placeholderTextColor={Colors.textSecondary}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                {showConfirm
                  ? <EyeOff color={Colors.textSecondary} size={18} />
                  : <Eye color={Colors.textSecondary} size={18} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.termsRow}>
            <View style={styles.termsDot} />
            <Text style={styles.termsText}>
              En créant un compte, vous acceptez nos{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://matistore.tech/privacy-rule')}
              >
                conditions d'utilisation
              </Text>
              {/* {' '}et notre{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://matistore.tech/privacy-rule')}
              >
                politique de confidentialité
              </Text> */}
            </Text>
          </View>

          <GreenButton
            title="Créer mon compte"
            onPress={handleCreate}
            size="lg"
            style={styles.btn}
            loading={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  backBtn: { padding: 20, paddingTop: 56, alignSelf: 'flex-start' },
  content: { paddingHorizontal: 24, paddingTop: 8 },

  stepIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  step: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepActive: { backgroundColor: Colors.primaryGreen, borderColor: Colors.primaryGreen },
  stepActiveText: { color: '#000', fontWeight: '800', fontSize: 14 },
  stepDone: { backgroundColor: Colors.secondaryGreen, borderColor: Colors.secondaryGreen },
  stepDoneText: { color: '#000', fontWeight: '800', fontSize: 14 },
  stepLine: { flex: 1, height: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  stepLineDone: { backgroundColor: Colors.secondaryGreen },

  title: { color: Colors.white, fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 20 },

  summaryCard: {
    backgroundColor: 'rgba(125,255,42,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.2)',
    padding: 12,
    marginBottom: 20,
  },
  summaryText: { color: Colors.primaryGreen, fontSize: 13, fontWeight: '600' },

  errorBox: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: Colors.error, fontSize: 13 },

  inputGroup: { marginBottom: 16 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.white, fontSize: 15, paddingVertical: 14 },
  inputPad: { paddingRight: 40 },
  eyeBtn: { position: 'absolute', right: 14 },

  // Sélecteur de pays
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 8,
  },
  // On cache le rendu natif du bouton CountryPicker car on gère l'ouverture nous-mêmes
  pickerHidden: {
    opacity: 0,
    position: 'absolute',
    width: 0,
    height: 0,
  },
  callingCodeText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: Colors.border,
    marginHorizontal: 10,
  },
  phoneInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    paddingVertical: 14,
  },

  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: 24, marginTop: 4,
  },
  termsDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.primaryGreen, marginTop: 5,
  },
  termsText: { flex: 1, color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  termsLink: { color: Colors.primaryGreen, fontWeight: '600' },
  btn: { width: '100%' },
});
