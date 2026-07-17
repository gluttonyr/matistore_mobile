import { Colors } from '@/constants/colors';
import { Banniere } from '@/data_api/models/banniere.types';
import { Discussion, DiscussionStatus } from '@/data_api/models/discussion.types';
import { AdminDashboardStats } from '@/data_api/models/stats.types';
import { banniereService } from '@/data_api/services/banniereService';
import { discussionService } from '@/data_api/services/discussionService';
import { statsService } from '@/data_api/services/statsService';
import { useFileUrl } from '@/hooks/useFileUrl';
import { goToTab } from '@/utils/tabNavigation';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Crown,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Settings2,
  Shield,
  Users,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const SLIDE_PREVIEW_WIDTH = 140;

const EMPTY_STATS: AdminDashboardStats = {
  usersTotal: 0,
  usersNewToday: 0,
  usersOnline: 0,
  supportTotal: 0,
  forumMessages: 0,
};

// ─── Catégorisation d'une discussion (icône/couleur) ───────────────────────────

type DiscussionCategory = 'deposit' | 'withdrawal' | 'support';

const CATEGORY_CONFIG: Record<
  DiscussionCategory,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  deposit: {
    icon: <ArrowDownToLine size={14} color={Colors.primaryGreen} />,
    color: Colors.primaryGreen,
    bg: 'rgba(125,255,42,0.1)',
  },
  withdrawal: {
    icon: <ArrowUpFromLine size={14} color="#F59E0B" />,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
  },
  support: {
    icon: <MessageCircle size={14} color="#38BDF8" />,
    color: '#38BDF8',
    bg: 'rgba(56,189,248,0.1)',
  },
};

function getDiscussionCategory(discussion: Discussion): DiscussionCategory {
  if (discussion.statut === DiscussionStatus.DEPOT) return 'deposit';
  if (discussion.statut === DiscussionStatus.RETRAIT) return 'withdrawal';
  return 'support';
}

// Format type WhatsApp, identique à (admin)/chats/index.tsx
function formatActivityTime(isoDate?: string | null): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return `${diffHours} h`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

// ─── Composant image (respecte les règles des hooks dans une liste) ───────────

function BannerPreviewImage({ image, style }: { image?: string | null; style?: any }) {
  const uri = useFileUrl('banners', image);
  if (!uri) return <View style={[style, { backgroundColor: Colors.cardBg }]} />;
  return <Image source={{ uri }} style={style} />;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [banners, setBanners] = useState<Banniere[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats>(EMPTY_STATS);
  const [unreadDiscussions, setUnreadDiscussions] = useState<Discussion[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    banniereService
      .getAll()
      .then(setBanners)
      .catch(() => {});
  }, []);

  useEffect(() => {
    statsService
      .getAdminDashboardStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  // Rechargé à chaque retour sur cet écran : après avoir ouvert une discussion,
  // ses messages sont marqués lus (voir MessageGateway.handleJoin), donc la
  // liste "non lues" doit refléter ça au retour.
  useFocusEffect(
    useCallback(() => {
      discussionService
        .getUnreadForAdmin()
        .then(setUnreadDiscussions)
        .catch(() => {});
    }, [])
  );

  const openDiscussion = (discussion: Discussion) => {
    const category = getDiscussionCategory(discussion);
    goToTab('chats');
    router.push({
      pathname: 'admin_chats/[id]',
      params: {
        id: discussion.trackingId,
        name: discussion.username || discussion.titre,
        category,
      },
    });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <LinearGradient colors={[Colors.secondaryBg, Colors.darkBg]} style={styles.header}>
        <Animated.View
          style={[
            styles.headerLeft,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.adminAvatarWrap}>
            <LinearGradient colors={['#A78BFA', '#7C3AED']} style={styles.adminAvatar}>
              <Crown color="#fff" size={18} />
            </LinearGradient>
            <View style={styles.adminOnlineDot} />
          </View>
          <View>
            <Text style={styles.headerGreet}>{greeting},</Text>
            <View style={styles.adminNameRow}>
              <Text style={styles.headerName}>Administrateur</Text>
              <View style={styles.adminBadge}>
                <Shield color="#A78BFA" size={9} />
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >

        {/* ── Users Stats ── */}
        <Animated.View
          style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Utilisateurs</Text>
            <TouchableOpacity
              style={styles.seeAll}
              onPress={() => router.push('/(admin)/users' as any)}
            >
              <Text style={styles.seeAllText}>Gérer</Text>
              <ChevronRight color="#A78BFA" size={15} />
            </TouchableOpacity>
          </View>

          {/* Main total card */}
          <View style={styles.usersTotalCard}>
            <LinearGradient
              colors={['rgba(167,139,250,0.18)', 'rgba(167,139,250,0.04)']}
              style={styles.usersTotalGrad}
            >
              <View style={styles.usersTotalLeft}>
                <View style={styles.usersTotalIconWrap}>
                  <Users color="#A78BFA" size={22} />
                </View>
                <View>
                  <Text style={styles.usersTotalBig}>
                    {stats.usersTotal.toLocaleString()}
                  </Text>
                  <Text style={styles.usersTotalLabel}>Total inscrits</Text>
                </View>
              </View>
              <View style={styles.usersTotalDivider} />
              <View style={styles.usersMiniCol}>
                <View style={styles.usersMiniItem}>
                  <View style={[styles.usersMiniDot, { backgroundColor: Colors.primaryGreen }]} />
                  <View>
                    <Text style={[styles.usersMiniNum, { color: Colors.primaryGreen }]}>
                      {stats.usersOnline}
                    </Text>
                    <Text style={styles.usersMiniLabel}>En ligne</Text>
                  </View>
                </View>
                <View style={styles.usersMiniSep} />
                <View style={styles.usersMiniItem}>
                  <View style={[styles.usersMiniDot, { backgroundColor: '#38BDF8' }]} />
                  <View>
                    <Text style={[styles.usersMiniNum, { color: '#38BDF8' }]}>
                      +{stats.usersNewToday}
                    </Text>
                    <Text style={styles.usersMiniLabel}>Nouveaux</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Sub stat chips */}
          <View style={styles.usersChipRow}>
            <View style={[styles.usersChip, { borderColor: 'rgba(125,255,42,0.25)' }]}>
              <Zap color={Colors.primaryGreen} size={13} />
              <Text style={[styles.usersChipNum, { color: Colors.primaryGreen }]}>
                {stats.usersOnline}
              </Text>
              <Text style={styles.usersChipLabel}>actifs maintenant</Text>
            </View>
            <View style={[styles.usersChip, { borderColor: 'rgba(56,189,248,0.25)' }]}>
              <Activity color="#38BDF8" size={13} />
              <Text style={[styles.usersChipNum, { color: '#38BDF8' }]}>
                {stats.usersNewToday}
              </Text>
              <Text style={styles.usersChipLabel}>aujourd'hui</Text>
            </View>
            <View style={[styles.usersChip, { borderColor: 'rgba(251,146,60,0.25)' }]}>
              <MessageSquare color="#FB923C" size={13} />
              <Text style={[styles.usersChipNum, { color: '#FB923C' }]}>
                {stats.forumMessages}
              </Text>
              <Text style={styles.usersChipLabel}>messages forum</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Bannières (aperçu slides home) ── */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <ImageIcon color="#A78BFA" size={15} />
              <Text style={styles.sectionTitle}>Bannières home</Text>
            </View>
            <TouchableOpacity
              style={styles.configureBtn}
              onPress={() => router.push('/config/slide-editor' as any)}
              activeOpacity={0.8}
            >
              <Settings2 color="#A78BFA" size={13} />
              <Text style={styles.configureBtnText}>Configurer tout</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slidesPreviewScroll}
          >
            {banners.map((slide, i) => (
              <TouchableOpacity
                key={slide.trackingId}
                style={styles.slidePreviewCard}
                onPress={() =>
                  router.push({
                    pathname: '/config/slide-editor' as any,
                    params: { focusId: slide.trackingId },
                  })
                }
                activeOpacity={0.85}
              >
                <BannerPreviewImage
                  image={slide.image}
                  style={styles.slidePreviewImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={styles.slidePreviewGrad}
                >
                  <Text style={styles.slidePreviewIndex}>{i + 1}</Text>
                  <Text style={styles.slidePreviewTitle} numberOfLines={1}>
                    {slide.titre}
                  </Text>
                  {!!slide.texteCta && (
                    <View style={styles.slidePreviewCTAChip}>
                      <Text style={styles.slidePreviewCTAText} numberOfLines={1}>
                        {slide.texteCta}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
                {/* Edit overlay icon */}
                <View style={styles.slidePreviewEditDot}>
                  <Settings2 color="#fff" size={10} />
                </View>
              </TouchableOpacity>
            ))}

            {/* Add slide card */}
            <TouchableOpacity
              style={styles.slideAddCard}
              onPress={() =>
                router.push({
                  pathname: '/config/slide-editor' as any,
                  params: { addNew: 'true' },
                })
              }
              activeOpacity={0.8}
            >
              <View style={styles.slideAddInner}>
                <Text style={styles.slideAddPlus}>+</Text>
                <Text style={styles.slideAddLabel}>Ajouter</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* ── Activité récente ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activité récente</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          {unreadDiscussions.length === 0 ? (
            <Text style={styles.activityEmptyText}>Aucun message non lu pour l'instant.</Text>
          ) : (
            unreadDiscussions.slice(0, 5).map((discussion, i, arr) => {
              const conf = CATEGORY_CONFIG[getDiscussionCategory(discussion)];
              return (
                <TouchableOpacity
                  key={discussion.trackingId}
                  style={[
                    styles.activityRow,
                    i === arr.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => openDiscussion(discussion)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.activityIcon, { backgroundColor: conf.bg }]}>
                    {conf.icon}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {discussion.username || discussion.titre}
                    </Text>
                    <Text style={styles.activityBody} numberOfLines={1}>
                      {discussion.lastMessageContent ?? 'Nouveau message'}
                    </Text>
                  </View>
                  <View style={styles.activityRight}>
                    <Text style={styles.activityTime}>{formatActivityTime(discussion.lastMessageAt)}</Text>
                    <View style={styles.activityUnreadBadge}>
                      <Text style={styles.activityUnreadBadgeText}>{discussion.unreadCount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── Quick Nav ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigation rapide</Text>
          <View style={styles.quickNavGrid}>
            {[
              {
                label: 'Messages',
                icon: <MessageCircle color="#38BDF8" size={20} />,
                bg: 'rgba(56,189,248,0.1)',
                route: '/(admin)/chats',
              },
              {
                label: 'Forum',
                icon: <MessageSquare color="#FB923C" size={20} />,
                bg: 'rgba(251,146,60,0.1)',
                route: '/(admin)/forum',
              },
              {
                label: 'Dépôts',
                icon: <ArrowDownToLine color={Colors.primaryGreen} size={20} />,
                bg: 'rgba(125,255,42,0.1)',
                route: '/(admin)/chats',
              },
              {
                label: 'Retraits',
                icon: <ArrowUpFromLine color="#F59E0B" size={20} />,
                bg: 'rgba(245,158,11,0.1)',
                route: '/(admin)/chats',
              },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.quickNavCard, { backgroundColor: item.bg }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.8}
              >
                {item.icon}
                <Text style={styles.quickNavLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminAvatarWrap: { position: 'relative' },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminOnlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.primaryGreen,
    borderWidth: 2,
    borderColor: Colors.darkBg,
  },
  headerGreet: { color: Colors.textSecondary, fontSize: 12 },
  adminNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1 },
  headerName: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(167,139,250,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  adminBadgeText: { color: '#A78BFA', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },

  // Users card
  usersTotalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  usersTotalGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  usersTotalLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  usersTotalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(167,139,250,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  usersTotalBig: { color: Colors.white, fontSize: 30, fontWeight: '900' },
  usersTotalLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 1 },
  usersTotalDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  usersMiniCol: { gap: 10 },
  usersMiniItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usersMiniDot: { width: 7, height: 7, borderRadius: 4 },
  usersMiniNum: { fontSize: 16, fontWeight: '800' },
  usersMiniLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '500' },
  usersMiniSep: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 2,
  },

  // Chips row
  usersChipRow: { flexDirection: 'row', gap: 8 },
  usersChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  usersChipNum: { fontSize: 13, fontWeight: '800' },
  usersChipLabel: { color: Colors.textSecondary, fontSize: 9, fontWeight: '600', flex: 1 },

  // Slides preview
  slidesPreviewScroll: { gap: 10, paddingRight: 4 },
  slidePreviewCard: {
    width: SLIDE_PREVIEW_WIDTH,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    position: 'relative',
  },
  slidePreviewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  slidePreviewGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
    justifyContent: 'flex-end',
    padding: 8,
    gap: 3,
  },
  slidePreviewIndex: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  slidePreviewTitle: { color: '#fff', fontSize: 10, fontWeight: '700' },
  slidePreviewCTAChip: {
    backgroundColor: 'rgba(125,255,42,0.25)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  slidePreviewCTAText: {
    color: Colors.primaryGreen,
    fontSize: 8,
    fontWeight: '700',
  },
  slidePreviewEditDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideAddCard: {
    width: 70,
    height: 96,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.04)',
  },
  slideAddInner: { alignItems: 'center', gap: 4 },
  slideAddPlus: { color: '#A78BFA', fontSize: 22, fontWeight: '300', lineHeight: 26 },
  slideAddLabel: { color: '#A78BFA', fontSize: 9, fontWeight: '700' },

  // Configure button
  configureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  configureBtnText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },

  // Activity
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primaryGreen },
  liveText: { color: Colors.primaryGreen, fontSize: 11, fontWeight: '700' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: { flex: 1 },
  activityTitle: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  activityBody: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  activityRight: { alignItems: 'flex-end', gap: 5 },
  activityTime: { color: Colors.textSecondary, fontSize: 10 },
  activityEmptyText: { color: Colors.textSecondary, fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  activityUnreadBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#A78BFA',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  activityUnreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Quick nav
  quickNavGrid: { flexDirection: 'row', gap: 10 },
  quickNavCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickNavLabel: { color: Colors.white, fontSize: 11, fontWeight: '700' },
});