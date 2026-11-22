import { ImagePreviewModal } from '@/components/ImagePreviewModel';
import { CouponTicket } from '@/components/coupons/CouponTicket';
import { Colors } from '@/constants/colors';
import type { Coupon } from '@/data_api/models/coupon.types';
import { couponService } from '@/data_api/services/couponService';
import { socketService } from '@/data_api/services/socketService';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Ticket } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const dayKey = (iso: string) => new Date(iso).toDateString();

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Aujourd’hui';
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function CouponsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Coupon[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      const page = await couponService.list(undefined, 20);
      setItems(page.items);
      setHasMore(page.hasMore);
    } catch { /* keep */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (busy.current || !hasMore || !items.length) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const page = await couponService.list(items[items.length - 1].createdAt, 20);
      setItems((list) => [...list, ...page.items.filter((c) => !list.some((x) => x.id === c.id))]);
      setHasMore(page.hasMore);
    } catch { /* retry on next scroll */ } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  };

  useFocusEffect(useCallback(() => {
    void load();
    const socket = socketService.getSocket();
    const onChange = () => void load();
    socket?.on('couponsChanged', onChange);
    return () => { socket?.off('couponsChanged', onChange); };
  }, [load]));

  const sections = useMemo(() => {
    const groups: { key: string; iso: string; data: Coupon[] }[] = [];
    for (const c of items) {
      const key = dayKey(c.createdAt);
      const group = groups.find((g) => g.key === key);
      if (group) group.data.push(c);
      else groups.push({ key, iso: c.createdAt, data: [c] });
    }
    return groups;
  }, [items]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft color={Colors.white} size={20} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Coupons</Text>
          <Text style={s.sub}>Touchez un code pour le copier</Text>
        </View>
      </View>
      {loading ? <ActivityIndicator color={Colors.primaryGreen} style={{ marginTop: 60 }} /> : (
        <SectionList
          sections={sections}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            const d = new Date(section.iso);
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <View style={s.day}>
                <View style={[s.dayBox, isToday && s.dayBoxToday]}>
                  <Text style={[s.dayNum, isToday && { color: '#050505' }]}>{d.getDate()}</Text>
                  <Text style={[s.dayMonth, isToday && { color: '#050505' }]}>
                    {d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={s.dayLabel}>{dayLabel(section.iso)}</Text>
                  <Text style={s.sub}>{section.data.length} coupon{section.data.length > 1 ? 's' : ''}</Text>
                </View>
              </View>
            );
          }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 14 }}>
              <CouponTicket
                coupon={item}
                onZoom={() => setZoom(item.imageUrl)}
                onOpen={() => router.push({ pathname: '/coupons/[id]', params: { id: item.id } } as any)}
              />
            </View>
          )}
          ListEmptyComponent={(
            <View style={s.empty}>
              <Ticket color={Colors.primaryGreen} size={48} />
              <Text style={s.emptyText}>Aucun coupon pour le moment. Revenez bientôt !</Text>
            </View>
          )}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primaryGreen} style={{ padding: 16 }} /> : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primaryGreen} />}
        />
      )}
      <ImagePreviewModal uri={zoom} onClose={() => setZoom(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Colors.secondaryBg, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 18, fontWeight: '900' },
  sub: { color: Colors.textSecondary, fontSize: 12 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 14 },
  dayBox: { width: 48, height: 52, borderRadius: 14, backgroundColor: '#141414', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  dayBoxToday: { backgroundColor: Colors.primaryGreen, borderColor: Colors.primaryGreen },
  dayNum: { color: Colors.white, fontSize: 20, fontWeight: '900', lineHeight: 22 },
  dayMonth: { color: Colors.white, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  dayLabel: { color: Colors.white, fontSize: 15, fontWeight: '900' },
  empty: { alignItems: 'center', gap: 12, marginTop: 80, paddingHorizontal: 30 },
  emptyText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
});
