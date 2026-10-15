import { Colors } from '@/constants/colors';
import { Categorie } from '@/data_api/models/categorie.types';
import { Evenement } from '@/data_api/models/evenement.types';
import { getApiErrorMessage, logError } from '@/data_api/lib/logger';
import { categorieService } from '@/data_api/services/categorieService';
import { evenementService } from '@/data_api/services/evenementService';
import { useFileUrl } from '@/hooks/useFileUrl';
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
          renderItem={({ item }) => {
            const expired = isEventExpired(item.dateFin);
            return (
              <TouchableOpacity
                style={[styles.card, expired && styles.cardExpired]}
                onPress={() => router.push({ pathname: '/user_events/[id]', params: { id: item.trackingId } })}
                activeOpacity={0.85}
              >
                <EventCoverImage coverImage={item.coverImage} style={[styles.cardImage, expired && styles.cardImageExpired]} />
                <LinearGradient colors={['transparent', 'rgba(5,5,5,0.7)']} style={styles.cardImageGrad} />
                <View style={styles.catBadge}>
                  <Text style={styles.catText}>{categoryLabel(item.categorieId)}</Text>
                </View>
                {expired && (
                  <View style={styles.expiredBadge}>
                    <AlertTriangle color="#ff4d4d" size={12} />
                    <Text style={styles.expiredBadgeText}>Expiré</Text>
                  </View>
                )}
                <View style={styles.cardContent}>
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
              </TouchableOpacity>
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
  headerTitle: { color: Colors.white, fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
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
  filterActive: { backgroundColor: 'rgba(125,255,42,0.15)', borderColor: 'rgba(125,255,42,0.4)' },
  filterExpiredActive: { backgroundColor: 'rgba(255,77,77,0.12)', borderColor: 'rgba(255,77,77,0.4)' },
  filterText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', flexShrink: 0 },
  filterTextActive: { color: Colors.primaryGreen, fontWeight: '800' },
  filterTextExpiredActive: { color: '#ff4d4d', fontWeight: '800' },
  filterCount: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterCountActive: { backgroundColor: 'rgba(125,255,42,0.2)' },
  filterCountExpiredActive: { backgroundColor: 'rgba(255,77,77,0.2)' },
  filterCountText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '800' },
  filterCountTextActive: { color: Colors.white },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, gap: 20, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 16 },
  emptyText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(125,255,42,0.1)',
    borderWidth: 1, borderColor: 'rgba(125,255,42,0.25)',
  },
  emptyBtnText: { color: Colors.primaryGreen, fontWeight: '700' },
  card: {
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border,
  },
  cardExpired: { borderColor: 'rgba(255,77,77,0.3)', opacity: 0.8 },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  cardImageExpired: { opacity: 0.45 },
  cardImageGrad: { position: 'absolute', top: 100, left: 0, right: 0, height: 80 },
  catBadge: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(125,255,42,0.2)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(125,255,42,0.3)',
  },
  catText: { color: Colors.primaryGreen, fontSize: 11, fontWeight: '700' },
  expiredBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,77,77,0.2)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,77,77,0.4)',
  },
  expiredBadgeText: { color: '#ff4d4d', fontSize: 11, fontWeight: '700' },
  cardContent: { padding: 16, gap: 8 },
  cardTitle: { color: Colors.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
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
