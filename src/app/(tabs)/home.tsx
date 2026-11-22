import { UserAvatar } from '@/components/UserAvatar';
import MatiLogo from '@/components/ui/MatiLogo';
import { Colors } from '@/constants/colors';
import { Banniere } from '@/data_api/models/banniere.types';
import { DiscussionType } from '@/data_api/models/discussion.types';
import { banniereService } from '@/data_api/services/banniereService';
import { discussionService } from '@/data_api/services/discussionService';
import { useAuth } from '@/hooks/useAuth';
import { useFileUrl } from '@/hooks/useFileUrl';
import { openAppLink } from '@/utils/appLink';
import { goToTab } from '@/utils/tabNavigation';
import { SocialLinks } from '@/components/SocialLinks';
import { QuickDepositCard } from '@/components/QuickDepositCard';
import { HomeHighlights } from '@/components/HomeHighlights';
import { ChristmasHat, SnowCap, Snowfall } from '@/components/christmas/Christmas';
import { getLastSeenNotificationAt } from '@/storage/appNotificationSeen';
import { notificationService } from '@/data_api/services/notificationService';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { ArrowDownToLine, ArrowUpFromLine, Bell, ChevronRight, ReceiptText } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { transactionService } from '@/data_api/services/transactionService';
import type { Transaction } from '@/data_api/models/transaction.types';
import { PressableScale } from '@/components/ui/PressableScale';

const formatFcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
const txState = (t: Transaction) =>
  t.statut === 'VALIDEE' ? { label: t.type === 'DEPOT' ? 'crédité' : 'envoyé', color: Colors.primaryGreen }
    : t.statut === 'REJETEE' || t.statut === 'ANNULEE' ? { label: t.statut === 'ANNULEE' ? 'annulé' : 'échoué', color: '#FF7A7A' }
      : { label: 'en cours', color: '#FFB733' };
import {
  Animated, Dimensions, Easing, FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width;
// Same ratio as the crop the admin makes in config/slide-editor.tsx (aspect 3:2),
// so the banner shows the whole picture instead of cutting it a second time.
const BANNER_RATIO = 3 / 2; // until the first picture's own shape is known
const FILL = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } as const;

// The banner takes the shape of its pictures (the first one sets it), so a
// picture fills it whole: nothing cut off, no blurred edges.
function BannerImage({ image, onRatio }: { image?: string | null; onRatio?: (ratio: number) => void }) {
  const uri = useFileUrl('banners', image);

  useEffect(() => {
    if (!uri || !onRatio) return;
    Image.getSize(uri, (w, h) => { if (w && h) onRatio(w / h); }, () => {});
  }, [uri, onRatio]);

  if (!uri) return <View style={[FILL, { backgroundColor: Colors.cardBg }]} />;
  return <Image source={{ uri }} style={FILL} resizeMode="cover" />;
}

// Repli affiché quand les bannières ne peuvent pas être chargées (hors-ligne,
// serveur injoignable) ou qu'aucune n'est configurée : on garde la même mise
// en page que le vrai slider pour ne pas laisser un trou dans le design.
function BannerFallback({ size }: { size: { width: number; height: number } }) {
  return (
    <View style={[styles.slide, size]}>
      <LinearGradient
        colors={[Colors.secondaryGreen, Colors.darkBg]}
        style={styles.slideImage}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <LinearGradient colors={['transparent', 'rgba(5,5,5,0.85)']} style={styles.slideGradient}>
        <View style={styles.slideContent}>
          <MatiLogo size={40} showText={false} />
          <Text style={[styles.slideTitle, { marginTop: 10 }]}>Bienvenue sur MATI STORE</Text>
          <Text style={styles.slideSubtitle}>Découvrez nos offres et actualités</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function HomeScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  // Real width of the slider (narrower than the window next to the web sidebar).
  const [slideWidth, setSlideWidth] = useState(SLIDE_WIDTH);
  const [bannerRatio, setBannerRatio] = useState(BANNER_RATIO);
  const onFirstBannerRatio = useCallback((r: number) => setBannerRatio(Math.min(2.4, Math.max(1.2, r))), []);
  const slideSize = { width: slideWidth, height: Math.round(slideWidth / bannerRatio) };
  const sliderRef = useRef<FlatList>(null);
  const slideInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user, logout } = useAuth();
  const [banners, setBanners] = useState<Banniere[]>([]);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [depotRetraitId, setDepotRetraitId] = useState<string | null>(null);
  const [depositsAvailable, setDepositsAvailable] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    const refreshCaptureStatus = () => {
      transactionService.getCaptureStatus()
        .then((status) => { if (active) setDepositsAvailable(status.available); })
        .catch(() => { if (active) setDepositsAvailable(false); });
    };
    refreshCaptureStatus();
    if (user?.trackingId) {
      const userId = user.trackingId;
      notificationService.getMinePage({ limit: 1 }).then(async ({ items }) => {
        const lastSeenAt = await getLastSeenNotificationAt(userId);
        if (active) setHasNewNotifications(items.some((item) => new Date(item.createdAt).getTime() > lastSeenAt));
      }).catch(() => {});
    }
    const timer = setInterval(refreshCaptureStatus, 30_000);
    return () => { active = false; clearInterval(timer); };
  }, [user?.trackingId]));

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => setHasNewNotifications(true));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    banniereService
      .getAll()
      .then(setBanners)
      .catch(() => {})
      .finally(() => setBannersLoaded(true));
  }, []);

  // La discussion "Dépôt / Retrait" est créée automatiquement pour chaque utilisateur
  // (voir DiscussionService.createForUser côté backend) : on récupère son id ici pour
  // que les boutons de la home pointent vers la même discussion que celle utilisée
  // dans la liste des chats, exactement comme le fait le bouton équivalent sur la
  // page de dépôt/retrait elle-même.
  useEffect(() => {
    if (!user?.trackingId) return;
    discussionService
      .getByUserId(user.trackingId)
      .then((discussions) => {
        const depotRetrait = discussions.find((d) => d.type === DiscussionType.DEPOT_RETRAIT);
        setDepotRetraitId(depotRetrait?.trackingId ?? null);
      })
      .catch(() => {});
  }, [user?.trackingId]);

  useEffect(() => {
    if (banners.length === 0) return;
    slideInterval.current = setInterval(() => {
      const next = (activeSlide + 1) % banners.length;
      sliderRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveSlide(next);
    }, 3500);
    return () => { if (slideInterval.current) clearInterval(slideInterval.current); };
  }, [activeSlide, banners.length]);

  // Last operation, shown on the "Mes transactions" row.
  const [lastTx, setLastTx] = useState<Transaction | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    transactionService.getAll({ page: 1, limit: 1 })
      .then(({ items }) => { if (active) setLastTx(items[0] ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, []));

  const openBannerLink = (lien?: string | null) => openAppLink(lien);

  const openDeposit = () => {
    if (!depositsAvailable) return;
    if (!depotRetraitId) return;
    router.push({
      pathname: '/user_chats/deposit-withdrawal',
      params: { id: depotRetraitId, initialMode: 'deposit' },
    });
  };

  const openWithdrawal = () => {
    if (!depotRetraitId) return;
    router.push({
      pathname: '/user_chats/deposit-withdrawal',
      params: { id: depotRetraitId, initialMode: 'withdrawal' },
    });
  };

  return (
    <View style={styles.container}>
      <Snowfall count={8} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <LinearGradient colors={[Colors.secondaryBg, Colors.darkBg]} style={styles.header}>
          <View style={styles.headerLeft}>
            <View>
              <View style={styles.avatarRing}>
                <UserAvatar image={user?.image} size={38} fallback={<MatiLogo size={38} showText={false} />} />
              </View>
              <ChristmasHat size={44} />
            </View>
            <View style={styles.headerNameWrap}>
              <Text style={styles.headerGreet}>{new Date().getHours() >= 18 || new Date().getHours() < 4 ? 'Bonsoir,' : 'Bonjour,'}</Text>
              <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">
                {user?.prenom} {user?.nom}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <SocialLinks variant="toolbar" />
            <TouchableOpacity
              style={styles.notificationsButton}
              onPress={() => router.push('/user_notifications' as any)}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir les notifications"
            >
              <Bell color={Colors.white} size={21} />
              {hasNewNotifications && <View style={styles.notificationDot} />}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Hero Slider */}
        {bannersLoaded && banners.length === 0 && (
          <View style={styles.sliderContainer}>
            <BannerFallback size={slideSize} />
          </View>
        )}
        {banners.length > 0 && (
          <View
            style={styles.sliderContainer}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              if (w > 0 && w !== slideWidth) setSlideWidth(w);
            }}
          >
            <FlatList
              ref={sliderRef}
              data={banners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.trackingId}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
                setActiveSlide(index);
              }}
              renderItem={({ item, index }) => (
                <View style={[styles.slide, slideSize]}>
                  <BannerImage image={item.image} onRatio={index === 0 ? onFirstBannerRatio : undefined} />
                  <LinearGradient
                    colors={['transparent', 'rgba(5,5,5,0.85)']}
                    style={styles.slideGradient}
                  >
                    <View style={styles.slideContent}>
                      <View style={styles.slideBadge}>
                        <Text style={styles.slideBadgeText}>OFFRE SPÉCIALE</Text>
                      </View>
                      <Text style={styles.slideTitle}>{item.titre}</Text>
                      {!!item.sousTitre && <Text style={styles.slideSubtitle}>{item.sousTitre}</Text>}
                      {!!item.texteCta && (
                        <TouchableOpacity style={styles.slideCTA} onPress={() => openBannerLink(item.lien)}>
                          <LinearGradient colors={[Colors.primaryGreen, Colors.secondaryGreen]} style={styles.slideCTAGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={styles.slideCTAText}>{item.texteCta}</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              )}
            />
            <View style={styles.pagination}>
              {banners.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeSlide && styles.dotActive]} />
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.quickActions}>
            {/* Dépôt */}
            <PressableScale
              style={[styles.quickAction, styles.quickActionDeposit, !depositsAvailable && { opacity: 0.45 }]}
              onPress={openDeposit}
              disabled={!depositsAvailable}
              accessibilityLabel="Faire un dépôt"
            >
              <SnowCap variant={0} height={24} />
              <View style={[styles.quickActionIconWrap, styles.quickActionIconWrapSolid]}>
                <ArrowDownToLine color="#050505" size={21} strokeWidth={2.6} />
              </View>
              <View>
                <Text style={[styles.quickActionLabel, { color: '#050505' }]}>Dépôt</Text>
                <Text style={[styles.quickActionSub, { color: 'rgba(5,5,5,0.62)' }]} numberOfLines={1}>
                  {depositsAvailable ? 'Recharger mon compte' : 'Indisponible pour le moment'}
                </Text>
              </View>
            </PressableScale>

            {/* Retrait */}
            <PressableScale style={[styles.quickAction, styles.quickActionOutline]} onPress={openWithdrawal} accessibilityLabel="Faire un retrait">
              <SnowCap variant={1} height={24} />
              <View style={styles.quickActionIconWrap}>
                <ArrowUpFromLine color={Colors.primaryGreen} size={21} strokeWidth={2.6} />
              </View>
              <View>
                <Text style={[styles.quickActionLabel, { color: Colors.primaryGreen }]}>Retrait</Text>
                <Text style={styles.quickActionSub} numberOfLines={1}>Vers Mobile Money</Text>
              </View>
            </PressableScale>
          </View>

          {/* Mes transactions, avec l'état de la dernière opération */}
          <PressableScale
            style={styles.transactionsShortcut}
            onPress={() => router.push('/user_transactions' as any)}
            accessibilityLabel="Ouvrir mes transactions et mon historique"
          >
            <View style={styles.transactionsShortcutIcon}>
              <ReceiptText color={Colors.white} size={19} />
            </View>
            <View style={styles.transactionsShortcutCopy}>
              <Text style={styles.transactionsShortcutTitle}>Mes transactions</Text>
              {lastTx ? (
                <View style={styles.lastTxRow}>
                  <View style={[styles.lastTxDot, { backgroundColor: txState(lastTx).color }]} />
                  <Text style={styles.transactionsShortcutSubtitle} numberOfLines={1}>
                    Dernier : {lastTx.type === 'DEPOT' ? 'dépôt' : 'retrait'} {formatFcfa(lastTx.montant)} · {txState(lastTx).label}
                  </Text>
                </View>
              ) : (
                <Text style={styles.transactionsShortcutSubtitle}>Consulter mon historique et leur état</Text>
              )}
            </View>
            <ChevronRight color={Colors.textSecondary} size={20} />
          </PressableScale>

          <QuickDepositCard discussionId={depotRetraitId} depositsAvailable={depositsAvailable} />
        </Animated.View>

        <HomeHighlights />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  headerNameWrap: { flexShrink: 1, minWidth: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  notificationsButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border },
  notificationDot: { position: 'absolute', top: 5, right: 5, width: 11, height: 11, borderRadius: 6, backgroundColor: '#FF453A', borderWidth: 1.5, borderColor: Colors.secondaryBg },
  headerGreet: { color: Colors.textSecondary, fontSize: 12 },
  headerName: { color: Colors.white, fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
  avatarRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  sliderContainer: { marginBottom: 8 },
  slide: { width: SLIDE_WIDTH, height: 220, position: 'relative', overflow: 'hidden' },
  slideImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  slideGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
    justifyContent: 'flex-end', padding: 20,
  },
  slideContent: {},
  slideBadge: {
    backgroundColor: 'rgba(125,255,42,0.2)',
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 6,
  },
  slideBadgeText: { color: Colors.primaryGreen, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  slideTitle: { color: Colors.white, fontSize: 26, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  slideSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 12 },
  slideCTA: { alignSelf: 'flex-start' },
  slideCTAGrad: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  slideCTAText: { color: '#000', fontWeight: '800', fontSize: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 24, backgroundColor: Colors.primaryGreen },

  section: { paddingHorizontal: 20, marginTop: 8, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: Colors.white, fontSize: 17, fontWeight: '800', marginBottom: 14, letterSpacing: 0.3 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { color: Colors.primaryGreen, fontSize: 13, fontWeight: '600' },

  quickActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  quickAction: { flex: 1, height: 112, borderRadius: 22, padding: 14, justifyContent: 'space-between' },
  quickActionDeposit: {
    backgroundColor: Colors.primaryGreen,
    shadowColor: Colors.primaryGreen, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  quickActionOutline: { borderWidth: 1.5, borderColor: 'rgba(125,255,42,0.45)', backgroundColor: '#0E0E0E' },
  quickActionIconWrap: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(125,255,42,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionIconWrapSolid: { backgroundColor: 'rgba(5,5,5,0.12)' },
  quickActionLabel: { color: Colors.white, fontSize: 19, fontWeight: '900', letterSpacing: 0.2 },
  quickActionSub: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  transactionsShortcut: { marginTop: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0E0E0E', borderWidth: 1, borderColor: Colors.border },
  transactionsShortcutIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  transactionsShortcutCopy: { flex: 1, gap: 3, minWidth: 0 },
  transactionsShortcutTitle: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  transactionsShortcutSubtitle: { color: Colors.textSecondary, fontSize: 12, flexShrink: 1 },
  lastTxRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lastTxDot: { width: 6, height: 6, borderRadius: 3 },

});
