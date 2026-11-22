import GreenButton from '@/components/ui/GreenButton';
import MatiLogo from '@/components/ui/MatiLogo';
import { Colors } from '@/constants/colors';
import { authService } from '@/data_api/services/authService';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useAppleAuth } from '@/hooks/useAppleAuth';
import AppleWebButton from '@/components/AppleWebButton';
import { authStorage } from '@/storage/authStorage';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, Headphones, Lock, Mail, Zap } from 'lucide-react-native';
import { AnyActionArg, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';
import {
  Animated, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loginInProgressRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  // The logo floats gently above the form.
  const floatAnim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);
  const queryClient = useQueryClient();
  const { signInWithGoogle, loading: googleLoading, available: googleAvailable } = useGoogleAuth();
  const { signInWithApple } = useAppleAuth();
  

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (loginInProgressRef.current) return;
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    loginInProgressRef.current = true;
    setError('');
    setLoading(true);
    let navigationStarted = false;
    try {
      const res = await authService.login({ email, password });
      await authStorage.setToken(res.data.access_token);
      await authStorage.setUser(res.data.user);

      queryClient.setQueryData(['user'], res.data.user);
      Toast.show({
        type: 'success',
        text1: 'Connexion réussie',
        text2: 'Vous êtes maintenant connecté à votre compte.',
      });
      if (res.data.user.role === "ADMIN") {
        navigationStarted = true;
        router.replace('/(admin)/admin-home');
      } else {
        navigationStarted = true;
        router.replace('/(tabs)/home');
      }

    } catch (err:any) {
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
    } finally {
      if (!navigationStarted) {
        loginInProgressRef.current = false;
        setLoading(false);
      }
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
        end={{ x: 0.5, y: 0.4 }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft color={Colors.textSecondary} size={24} />
        </TouchableOpacity>

        {/* Logo qui flotte */}
        <View style={styles.illustrationContainer}>
          <View style={styles.logoGlow} />
          <Animated.View style={{ transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>
            <MatiLogo size={120} showText={false} />
          </Animated.View>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>Content de vous revoir</Text>
          <Text style={styles.subtitle}>Connectez-vous à votre compte Matistore</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, focused === 'email' && styles.inputWrapperFocused]}>
              <Mail color={focused === 'email' ? Colors.primaryGreen : Colors.textSecondary} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={[styles.inputWrapper, focused === 'password' && styles.inputWrapperFocused]}>
              <Lock color={focused === 'password' ? Colors.primaryGreen : Colors.textSecondary} size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputPadRight]}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                {showPassword
                  ? <EyeOff color={Colors.textSecondary} size={18} />
                  : <Eye color={Colors.textSecondary} size={18} />
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity> */}

          <GreenButton
            title="Se connecter"
            onPress={handleLogin}
            size="lg"
            style={styles.loginBtn}
            loading={loading}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {googleAvailable && (
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={signInWithGoogle}
            disabled={googleLoading}
          >
            <Image
              source={require('@/assets/google.webp')}
              style={styles.googleIcon}
              resizeMode="contain"
            />

            <Text style={styles.googleText}>
              {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
            </Text>
          </TouchableOpacity>
          )}

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              // White on the dark background: a black button would be invisible (App Store guideline 4).
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={10}
              style={styles.appleBtn}
              onPress={signInWithApple}
            />
          )}
          {Platform.OS === 'web' && <AppleWebButton title="Continuer avec Apple" onPress={signInWithApple} />}

          <View style={styles.trustRow}>
            <View style={styles.trustTile}>
              <View style={[styles.trustIcon, { backgroundColor: 'rgba(125,255,42,0.12)' }]}><Zap color={Colors.primaryGreen} size={16} /></View>
              <Text style={styles.trustText}>Dépôts et retraits instantanés</Text>
            </View>
            <View style={styles.trustTile}>
              <View style={[styles.trustIcon, { backgroundColor: 'rgba(167,139,250,0.14)' }]}><Headphones color="#A78BFA" size={16} /></View>
              <Text style={styles.trustText}>Support humain 7j/7</Text>
            </View>
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register-step1')}>
              <Text style={styles.registerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  backBtn: { padding: 20, paddingTop: 56, alignSelf: 'flex-start' },
  illustrationContainer: { height: 150, alignItems: 'center', justifyContent: 'center' },
  logoGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(125,255,42,0.07)' },
  inputWrapperFocused: {
    borderColor: Colors.primaryGreen,
    borderWidth: 1.5,
    backgroundColor: 'rgba(125,255,42,0.04)',
  },
  trustRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  trustTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: '#0E0E0E', borderWidth: 1, borderColor: Colors.border },
  trustIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trustText: { flex: 1, color: '#D6D6D6', fontSize: 12, fontWeight: '600' },
  lockIllustration: { position: 'relative', width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  lockOuter: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 1, borderColor: 'rgba(125,255,42,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  lockInner: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  lockGlow: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(125,255,42,0.06)',
  },
  lockDot: {
    position: 'absolute', width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.primaryGreen, opacity: 0.5,
  },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  title: { color: Colors.white, fontSize: 28, fontWeight: '900', marginTop: 8, letterSpacing: -0.3, textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 28, textAlign: 'center' },
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
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0E0E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    paddingVertical: 14,
  },
  inputPadRight: { paddingRight: 40 },
  eyeBtn: { position: 'absolute', right: 14 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { color: Colors.primaryGreen, fontSize: 13, fontWeight: '600' },
  loginBtn: { width: '100%', marginBottom: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textSecondary, fontSize: 13, marginHorizontal: 16 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E0E0E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 22,
  },
  googleIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  googleLetter: { color: '#EA4335', fontSize: 14, fontWeight: '800' },
  googleText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  appleBtn: { width: '100%', height: 50, marginTop: 12 },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: Colors.textSecondary, fontSize: 14 },
  registerLink: { color: Colors.primaryGreen, fontSize: 14, fontWeight: '700' },
});
