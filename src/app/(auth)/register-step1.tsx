import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { User, Mail, ChevronLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import GreenButton from '@/components/ui/GreenButton';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useAppleAuth } from '@/hooks/useAppleAuth';
import AppleWebButton from '@/components/AppleWebButton';
import * as AppleAuthentication from 'expo-apple-authentication';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

export default function RegisterStep1() {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();
  const { signInWithApple } = useAppleAuth();

  const handleNext = () => {
    if (!prenom || !nom || !email) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (!email.includes('@')) {
      setError('Adresse email invalide.');
      return;
    }
    setError('');
    router.push({ pathname: '/(auth)/register-step2', params: { prenom, nom, email } });
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
          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.step, styles.stepActive]}>
              <Text style={styles.stepActiveText}>1</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <Text style={styles.stepText}>2</Text>
            </View>
          </View>

          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Informations personnelles</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom</Text>
            <View style={styles.inputWrapper}>
              <User color={Colors.textSecondary} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Votre prénom"
                placeholderTextColor={Colors.textSecondary}
                value={prenom}
                onChangeText={setPrenom}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom</Text>
            <View style={styles.inputWrapper}>
              <User color={Colors.textSecondary} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Votre nom de famille"
                placeholderTextColor={Colors.textSecondary}
                value={nom}
                onChangeText={setNom}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Mail color={Colors.textSecondary} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <GreenButton
            title="Continuer"
            onPress={handleNext}
            size="lg"
            style={styles.btn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

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
              {googleLoading ? 'Connexion...' : "S'inscrire avec Google"}
            </Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={10}
              style={styles.appleBtn}
              onPress={signInWithApple}
            />
          )}
          {Platform.OS === 'web' && <AppleWebButton title="S'inscrire avec Apple" onPress={signInWithApple} />}

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
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
  stepText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  stepLine: { flex: 1, height: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  title: { color: Colors.white, fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 28 },
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
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
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
  btn: { width: '100%', marginTop: 8, marginBottom: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textSecondary, fontSize: 13, marginHorizontal: 16 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 24,
  },
  googleIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  googleText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  appleBtn: { width: '100%', height: 50, marginTop: 12 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: Colors.textSecondary, fontSize: 14 },
  loginLink: { color: Colors.primaryGreen, fontSize: 14, fontWeight: '700' },
});
