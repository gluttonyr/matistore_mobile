import { FadeIn } from '@/components/ui/FadeIn';
import { PressableScale } from '@/components/ui/PressableScale';
import { Colors } from '@/constants/colors';
import { Categorie } from '@/data_api/models/categorie.types';
import { Evenement } from '@/data_api/models/evenement.types';
import { getApiErrorMessage, logError } from '@/data_api/lib/logger';
import { categorieService } from '@/data_api/services/categorieService';
import { evenementService } from '@/data_api/services/evenementService';
import { useFileUrl } from '@/hooks/useFileUrl';
import { useWideWeb } from '@/hooks/useWideWeb';
import { isEventExpired } from '@/utils/eventDate';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { AlertTriangle, Calendar, ChevronRight, MapPin } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList, Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ALL_FILTER = 'Tous';
const EXPIRED_FILTER = 'expired';

function EventCoverImage({ coverImage, style }: { coverImage?: string | null; style?: any }) {
  const uri = useFileUrl('events', coverImage);
  if (!uri) return <View style={[style, { backgroundColor: Colors.border }]} />;
  return <Image source={{ uri }} style={style} />;
}

export default function EventsScreen() {
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);
  const [events, setEvents] = useState<Evenement[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wide = useWideWeb();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsData, categoriesData] = await Promise.all([
        evenementService.getAll(),
        categorieService.getAll(),
      ]);
      setEvents(eventsData);
      setCategories(categoriesData);
    } catch (err) {
      logError('Load events failed');
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const categoryLabel = (categorieId?: string | null) =>
    categories.find((c) => c.trackingId === categorieId)?.libelle ?? 'Sans catégorie';

  const activeEvents = events.filter((e) => !isEventExpired(e.dateFin));
  const expiredCount = events.filter((e) => isEventExpired(e.dateFin)).length;

  const filterChips = [
    { key: ALL_FILTER, label: 'Tous', count: activeEvents.length, isExpired: false },
    ...categories.map((c) => ({
      key: c.trackingId,
      label: c.libelle,
      count: activeEvents.filter((e) => e.categorieId === c.trackingId).length,
      isExpired: false,
    })),
    { key: EXPIRED_FILTER, label: 'Expirés', count: expiredCount, isExpired: true },
  ];

  const filtered = activeFilter === EXPIRED_FILTER
    ? events.filter((e) => isEventExpired(e.dateFin))
    : activeFilter === ALL_FILTER
      ? activeEvents
      : activeEvents.filter((e) => e.categorieId === activeFilter);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.secondaryBg, Colors.darkBg]} style={styles.header}>
        <Text style={styles.headerTitle}>Événements</Text>
        <Text style={styles.headerSub}>
          {activeFilter === EXPIRED_FILTER
            ? `${filtered.length} événement${filtered.length !== 1 ? 's' : ''} expiré${filtered.length !== 1 ? 's' : ''}`
            : `${filtered.length} événement${filtered.length !== 1 ? 's' : ''} à venir`}
        </Text>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersWrapper}>
        <FlatList
          data={filterChips}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filter,
                  isActive && (item.isExpired ? styles.filterExpiredActive : styles.filterActive),
                ]}
                onPress={() => setActiveFilter(item.key)}
                activeOpacity={0.8}
              >
                {item.isExpired && <AlertTriangle color={isActive ? '#ff4d4d' : Colors.textSecondary} size={12} />}
                <Text
                  style={[
                    styles.filterText,
                    isActive && (item.isExpired ? styles.filterTextExpiredActive : styles.filterTextActive),
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <View style={[styles.filterCount, isActive && (item.isExpired ? styles.filterCountExpiredActive : styles.filterCountActive)]}>
                  <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                    {item.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={Colors.primaryGreen} size="large" />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={loadData}>
            <Text style={styles.emptyBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          // website on a computer: cards in a 3-column grid (key forces a remount when the column count changes)
          key={wide ? 'grid' : 'list'}
          numColumns={wide ? 3 : 1}
          columnWrapperStyle={wide ? styles.gridRow : undefined}
          data={filtered}
          keyExtractor={(item) => item.trackingId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {activeFilter === EXPIRED_FILTER ? 'Aucun événement expiré.' : 'Aucun événement pour le moment.'}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const expired = isEventExpired(item.dateFin);
            const start = new Date(item.dateDebut);
            const open = () => router.push({ pathname: '/user_events/[id]', params: { id: item.trackingId } });

            // Phone: the first event is a big card, the next ones are compact rows.
            if (!wide && index > 0) {
              return (
                <FadeIn index={index}>
                  <PressableScale style={[styles.row, expired && styles.cardExpired]} onPress={open} accessibilityLabel={item.titre}>
                    <EventCoverImage coverImage={item.coverImage} style={[styles.rowImage, expired && styles.cardImageExpired]} />
                    <View style={styles.rowCopy}>
                      <Text style={[styles.rowDate, expired && { color: '#ff4d4d' }]}>
                        {start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase()}
                        {' · '}
                        {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.rowTitle} numberOfLines={2}>{item.titre}</Text>
                      <Text style={styles.metaText} numberOfLines={1}>{item.lieu ?? 'Lieu non précisé'}</Text>
                    </View>
                    <ChevronRight color={Colors.textSecondary} size={18} />
                  </PressableScale>
                </FadeIn>
              );
            }

            return (
              <FadeIn index={index} style={wide ? styles.cardGrid : undefined}>
              <PressableScale
                style={[styles.card, expired && styles.cardExpired]}
                onPress={open}
                accessibilityLabel={item.titre}
              >
                <EventCoverImage coverImage={item.coverImage} style={[styles.cardImage, expired && styles.cardImageExpired]} />
                <LinearGradient colors={['transparent', 'rgba(5,5,5,0.7)']} style={styles.cardImageGrad} />
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{start.getDate()}</Text>
                  <Text style={styles.dateMonth}>{start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase()}</Text>
                </View>
                {expired && (
                  <View style={styles.expiredBadge}>
                    <AlertTriangle color="#ff4d4d" size={12} />
                    <Text style={styles.expiredBadgeText}>Expiré</Text>
                  </View>
                )}
                <View style={styles.cardContent}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>{categoryLabel(item.categorieId)}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.titre}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Calendar color={expired ? '#ff4d4d' : Colors.primaryGreen} size={14} />
                      <Text style={styles.metaText}>
                        {new Date(item.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MapPin color={expired ? '#ff4d4d' : Colors.primaryGreen} size={14} />
                      <Text style={styles.metaText}>{item.lieu ?? 'Lieu non précisé'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => router.push({ pathname: '/user_events/[id]', params: { id: item.trackingId } })}
                  >
                    <Text style={styles.viewBtnText}>Voir les détails</Text>
                    <ChevronRight color={Colors.primaryGreen} size={16} />
                  </TouchableOpacity>
                </View>
              </PressableScale>
              </FadeIn>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: {
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
  },
  headerTitle: { color: Colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -0.3 },
  headerSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  filtersWrapper: {
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: Colors.border,
  flexGrow: 0,
  flexShrink: 0,
},
  filters: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
  },
  filterActive: { backgroundColor: '#F5F5F5', borderColor: '#F5F5F5' },
  filterExpiredActive: { backgroundColor: 'rgba(255,77,77,0.12)', borderColor: 'rgba(255,77,77,0.4)' },
  filterText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', flexShrink: 0 },
  filterTextActive: { color: '#050505', fontWeight: '800' },
  filterTextExpiredActive: { color: '#ff4d4d', fontWeight: '800' },
  filterCount: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterCountActive: { backgroundColor: '#050505' },
  filterCountExpiredActive: { backgroundColor: 'rgba(255,77,77,0.2)' },
  filterCountText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '800' },
  filterCountTextActive: { color: Colors.white },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, gap: 12, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 16 },
  emptyText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(125,255,42,0.1)',
    borderWidth: 1, borderColor: 'rgba(125,255,42,0.25)',
  },
  emptyBtnText: { color: Colors.primaryGreen, fontWeight: '700' },
  card: {
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#0E0E0E', borderWidth: 1, borderColor: Colors.border,
    marginBottom: 8,
  },
  dateBox: {
    position: 'absolute', top: 14, left: 14, width: 56, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(5,5,5,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { color: Colors.white, fontSize: 22, fontWeight: '900', lineHeight: 24 },
  dateMonth: { color: Colors.primaryGreen, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20,
    backgroundColor: '#0E0E0E', borderWidth: 1, borderColor: Colors.border,
  },
  rowImage: { width: 76, height: 76, borderRadius: 16, backgroundColor: Colors.cardBg },
  rowCopy: { flex: 1, gap: 4, minWidth: 0 },
  rowDate: { color: Colors.primaryGreen, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  rowTitle: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  gridRow: { gap: 20 },
  cardGrid: { width: '31.5%' },
  cardExpired: { borderColor: 'rgba(255,77,77,0.3)', opacity: 0.8 },
  cardImage: { width: '100%', height: 200, resizeMode: 'cover' },
  cardImageExpired: { opacity: 0.45 },
  cardImageGrad: { position: 'absolute', top: 120, left: 0, right: 0, height: 80 },
  catBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167,139,250,0.14)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  catText: { color: '#C4B5FD', fontSize: 11, fontWeight: '800' },
  expiredBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,77,77,0.2)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,77,77,0.4)',
  },
  expiredBadgeText: { color: '#ff4d4d', fontSize: 11, fontWeight: '700' },
  cardContent: { padding: 16, gap: 8 },
  cardTitle: { color: Colors.white, fontSize: 19, fontWeight: '900', letterSpacing: 0.1 },
  cardDesc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 4, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  viewBtnText: { color: Colors.primaryGreen, fontSize: 14, fontWeight: '700' },
});
