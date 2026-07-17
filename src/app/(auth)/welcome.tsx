import GreenButton from '@/components/ui/GreenButton';
import MatiLogo from '@/components/ui/MatiLogo';
import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(125,255,42,0.06)', Colors.darkBg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />

      {/* Decorative circles */}
      <View style={styles.circleTop} />
      <View style={styles.circleBottom} />

      {/* SVG Illustration */}
      <View style={styles.illustrationContainer}>
        <View style={styles.illustrationBox}>
          <View style={styles.phoneIllustration}>
            <View style={styles.phoneMock}>
              <View style={styles.phoneSpeaker} />
              <View style={styles.phoneScreen}>
                <LinearGradient colors={[Colors.cardBg, Colors.secondaryBg]} style={styles.screenGrad}>
                  <View style={styles.screenLine} />
                  <View style={[styles.screenLine, { width: '60%' }]} />
                  <View style={[styles.screenLine, { width: '80%', backgroundColor: 'rgba(125,255,42,0.4)' }]} />
                </LinearGradient>
              </View>
            </View>
            <View style={styles.glowOrb} />
          </View>
          <View style={styles.floatCard}>
            <View style={styles.floatDot} />
            <Text style={styles.floatText}>Sécurisé 100%</Text>
          </View>
          <View style={[styles.floatCard, styles.floatCardRight]}>
            <View style={[styles.floatDot, { backgroundColor: Colors.secondaryGreen }]} />
            <Text style={styles.floatText}>Rapide</Text>
          </View>
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <MatiLogo size={160} showText={true} />
        
        <Text style={styles.tagline}>Le store sécurisé et rapide !</Text>

        <View style={styles.buttonsContainer}>
          <GreenButton
            title="Se connecter"
            onPress={() => router.push('/(auth)/login')}
            size="lg"
            style={styles.btn}
          />
          <GreenButton
            title="Créer un compte"
            onPress={() => router.push('/(auth)/register-step1')}
            size="lg"
            variant="outline"
            style={styles.btn}
          />
        </View>

        <View style={styles.promoContainer}>
          <Text style={styles.promoLabel}>Code promo :</Text>
          <View style={styles.promoCode}>
            <Text style={styles.promoCodeText}>MAE96</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  circleTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(125,255,42,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.08)',
  },
  circleBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(125,255,42,0.03)',
  },
  illustrationContainer: {
    height: height * 0.35,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  illustrationBox: {
    position: 'relative',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneMock: {
    width: 90,
    height: 155,
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    overflow: 'hidden',
    paddingTop: 10,
  },
  phoneSpeaker: {
    width: 30,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  phoneScreen: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  screenGrad: {
    flex: 1,
    padding: 10,
    gap: 8,
  },
  screenLine: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    width: '100%',
  },
  glowOrb: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(125,255,42,0.08)',
    zIndex: -1,
  },
  floatCard: {
    position: 'absolute',
    left: -30,
    top: 30,
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  floatCardRight: {
    left: undefined,
    right: -30,
    top: 100,
  },
  floatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryGreen,
  },
  floatText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  welcomeText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
  appName: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 4,
  },
  tagline: {
    color: Colors.primaryGreen,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 32,
  },
  buttonsContainer: {
    width: '100%',
    gap: 14,
  },
  btn: {
    width: '100%',
  },
  promoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 32,
  },
  promoLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  promoCode: {
    backgroundColor: 'rgba(125,255,42,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.3)',
  },
  promoCodeText: {
    color: Colors.primaryGreen,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
