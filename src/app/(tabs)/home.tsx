import MatiLogo from '@/components/ui/MatiLogo';
import { Colors } from '@/constants/colors';
import { Banniere } from '@/data_api/models/banniere.types';
import { DiscussionType } from '@/data_api/models/discussion.types';
import { Evenement } from '@/data_api/models/evenement.types';
import { banniereService } from '@/data_api/services/banniereService';
import { discussionService } from '@/data_api/services/discussionService';
import { evenementService } from '@/data_api/services/evenementService';
import { useAuth } from '@/hooks/useAuth';
import { useFileUrl } from '@/hooks/useFileUrl';
import { openAppLink } from '@/utils/appLink';
import { goToTab } from '@/utils/tabNavigation';
import { SocialLinks } from '@/components/SocialLinks';
import { getLastSeenNotificationAt } from '@/storage/appNotificationSeen';
import { notificationService } from '@/data_api/services/notificationService';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { ArrowDownToLine, ArrowUpFromLine, Bell, ChevronRight, ReceiptText } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { transactionService } from '@/data_api/services/transactionService';
import {
  Animated, Dimensions, FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width;

function EventCoverImage({ coverImage, style }: { coverImage?: string | null; style?: any }) {
  const uri = useFileUrl('events', coverImage);
  if (!uri) return <View style={[style, { backgroundColor: Colors.cardBg }]} />;
  return <Image source={{ uri }} style={style} />;
}

function BannerImage({ image, style }: { image?: string | null; style?: any }) {
  const uri = useFileUrl('banners', image);
  if (!uri) return <View style={[style, { backgroundColor: Colors.cardBg }]} />;
  return <Image source={{ uri }} style={style} />;
}

// Repli affiché quand les bannières ne peuvent pas être chargées (hors-ligne,
// serveur injoignable) ou qu'aucune n'est configurée : on garde la même mise
// en page que le vrai slider pour ne pas laisser un trou dans le design.
function BannerFallback() {
  return (
    <View style={styles.slide}>
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
  const sliderRef = useRef<FlatList>(null);
  const slideInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user, logout } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<Evenement[]>([]);
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
    evenementService
      .getAll()
      .then((data) => setUpcomingEvents(data.slice(0, 3)))
      .catch(() => {});
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <LinearGradient colors={[Colors.secondaryBg, Colors.darkBg]} style={styles.header}>
          <View style={styles.headerLeft}>
            <MatiLogo size={36} showText={false} />
            <View style={styles.headerNameWrap}>
              <Text style={styles.headerGreet}>Bonjour,</Text>
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
            <BannerFallback />
          </View>
        )}
        {banners.length > 0 && (
          <View style={styles.sliderContainer}>
            <FlatList
              ref={sliderRef}
              data={banners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.trackingId}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SLIDE_WIDTH);
                setActiveSlide(index);
              }}
              renderItem={({ item }) => (
                <View style={styles.slide}>
                  <BannerImage image={item.image} style={styles.slideImage} />
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
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          <View style={styles.quickActions}>

            {/* Dépôt */}
            <TouchableOpacity style={[styles.quickAction, !depositsAvailable && { opacity: 0.45 }]} activeOpacity={0.85} onPress={openDeposit} disabled={!depositsAvailable}>
              <LinearGradient
                colors={[Colors.primaryGreen, Colors.secondaryGreen]}
                style={styles.quickActionGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.quickActionIconWrap, styles.quickActionIconWrapSolid]}>
                  <ArrowDownToLine color="#000" size={26} strokeWidth={2.5} />
                </View>
                <Text style={[styles.quickActionLabel, { color: '#000' }]}>Dépôt</Text>
                <Text style={[styles.quickActionSub, { color: 'rgba(0,0,0,0.55)' }]}>{depositsAvailable ? 'Recharger votre compte' : 'Dépôts temporairement indisponibles'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Retrait */}
            <TouchableOpacity
              style={[styles.quickAction, styles.quickActionOutline]}
              activeOpacity={0.85}
              onPress={openWithdrawal}
            >
              <View style={[styles.quickActionGrad, styles.quickActionGradOutline]}>
                <View style={styles.quickActionIconWrap}>
                  <ArrowUpFromLine color={Colors.primaryGreen} size={26} strokeWidth={2.5} />
                </View>
                <Text style={styles.quickActionLabel}>Retrait</Text>
                <Text style={styles.quickActionSub}>Récupérer vos gains</Text>
              </View>
            </TouchableOpacity>

          </View>
          <TouchableOpacity
            style={styles.transactionsShortcut}
            activeOpacity={0.8}
            onPress={() => router.push('/user_transactions' as any)}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir mes transactions et mon historique"
          >
            <View style={styles.transactionsShortcutIcon}>
              <ReceiptText color={Colors.primaryGreen} size={21} />
            </View>
            <View style={styles.transactionsShortcutCopy}>
              <Text style={styles.transactionsShortcutTitle}>Mes transactions</Text>
              <Text style={styles.transactionsShortcutSubtitle}>Consulter mon historique et leur état</Text>
            </View>
            <ChevronRight color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
        </Animated.View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Événements à venir</Text>
            <TouchableOpacity style={styles.seeAll} onPress={() => goToTab('events')}>
              <Text style={styles.seeAllText}>Tout voir</Text>
              <ChevronRight color={Colors.primaryGreen} size={16} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
            {upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.trackingId}
                style={styles.eventCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/user_events/[id]', params: { id: event.trackingId } })}
              >
                <EventCoverImage coverImage={event.coverImage} style={styles.eventImage} />
                <LinearGradient colors={['transparent', 'rgba(5,5,5,0.9)']} style={styles.eventGrad}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.titre}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(event.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
  headerName: { color: Colors.white, fontSize: 16, fontWeight: '800', letterSpacing: 1 },

  sliderContainer: { marginBottom: 8 },
  slide: { width: SLIDE_WIDTH, height: 220, position: 'relative' },
  slideImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  slideGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
    justifyContent: 'flex-end', padding: 20,
  },
  slideContent: {},
  slideBadge: {
    backgroundColor: 'rgba(125,255,42,0.2)',
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 6,
  },
  slideBadgeText: { color: Colors.primaryGreen, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  slideTitle: { color: Colors.white, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
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

  quickActions: { flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  quickActionOutline: {
    borderWidth: 1.5, borderColor: Colors.primaryGreen,
    backgroundColor: 'rgba(125,255,42,0.04)',
  },
  quickActionGrad: { padding: 20, alignItems: 'center', gap: 10 },
  quickActionGradOutline: { backgroundColor: 'transparent' },
  quickActionIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(125,255,42,0.1)',
    borderWidth: 1, borderColor: 'rgba(125,255,42,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionIconWrapSolid: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  quickActionLabel: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  quickActionSub: { color: Colors.textSecondary, fontSize: 11, textAlign: 'center' },
  transactionsShortcut: { marginTop: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border },
  transactionsShortcutIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(125,255,42,0.1)' },
  transactionsShortcutCopy: { flex: 1, gap: 3 },
  transactionsShortcutTitle: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  transactionsShortcutSubtitle: { color: Colors.textSecondary, fontSize: 11 },

  eventsScroll: { paddingRight: 20, gap: 12 },
  eventCard: {
    width: 200, height: 150, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
  },
  eventImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  eventGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%',
    justifyContent: 'flex-end', padding: 12,
  },
  eventCatBadge: {
    backgroundColor: 'rgba(125,255,42,0.2)',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    alignSelf: 'flex-start', marginBottom: 4,
  },
  eventCatText: { color: Colors.primaryGreen, fontSize: 9, fontWeight: '700' },
  eventTitle: { color: Colors.white, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  eventDate: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
});
