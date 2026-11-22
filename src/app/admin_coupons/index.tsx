import { InfoModal } from '@/components/infomodal';
import { STATUS, shareCoupon } from '@/components/coupons/CouponTicket';
import { Colors } from '@/constants/colors';
import type { Coupon, CouponStatus } from '@/data_api/models/coupon.types';
import { couponService } from '@/data_api/services/couponService';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Plus, Share2, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const when = (iso: string) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return `Aujourd’hui · ${time}`;
  if (d.toDateString() === new Date(Date.now() - 86_400_000).toDateString()) return `Hier · ${time}`;
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${time}`;
};

export default function AdminCouponsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Coupon[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    try {
      const page = await couponService.list(undefined, 30);
      setItems(page.items);
      setHasMore(page.hasMore);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Chargement impossible', text2: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const loadMore = async () => {
    if (!hasMore || !items.length || busy === 'more') return;
    setBusy('more');
    try {
      const page = await couponService.list(items[items.length - 1].createdAt, 30);
      setItems((list) => [...list, ...page.items.filter((c) => !list.some((x) => x.id === c.id))]);
      setHasMore(page.hasMore);
    } catch { /* retry on scroll */ } finally { setBusy(null); }
  };

  const setStatus = async (c: Coupon, status: CouponStatus) => {
    const next = c.status === status ? 'EN_COURS' : status;
    setBusy(c.id);
    try {
      const updated = await couponService.setStatus(c.id, next);
      setItems((list) => list.map((x) => (x.id === c.id ? updated : x)));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: getApiErrorMessage(error) });
    } finally { setBusy(null); }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await couponService.remove(toDelete.id);
      setItems((list) => list.filter((x) => x.id !== toDelete.id));
      Toast.show({ type: 'success', text1: 'Coupon supprimé' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: getApiErrorMessage(error) });
    }
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft color={Colors.white} size={20} />
        </TouchableOpacity>
        <Text style={s.title}>Coupons du jour</Text>
      </View>
      {loading ? <ActivityIndicator color={Colors.primaryGreen} style={{ marginTop: 60 }} /> : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 110, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primaryGreen} />}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={s.empty}>Aucun coupon publié. Touchez « Nouveau coupon ».</Text>}
          renderItem={({ item: c }) => {
            const st = STATUS[c.status];
            return (
              <View style={s.card}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/coupons/[id]', params: { id: c.id } } as any)}>
                  <Image source={{ uri: c.imageUrl }} style={s.thumb} />
                </TouchableOpacity>
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <View style={s.rowBetween}>
                    <Text style={s.when}>N°{c.number} · {when(c.createdAt)}</Text>
                    <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeText, { color: st.fg }]}>{st.label}</Text></View>
                  </View>
                  <Text style={s.codes} numberOfLines={2}>{c.codes.map((k) => `${k.name ?? k.bookmaker} ${k.code}`).join(' · ')}</Text>
                  {!!c.odds && <Text style={s.odds}>Cote {c.odds}</Text>}
                  <View style={s.actions}>
                    <TouchableOpacity style={[s.act, s.won, c.status === 'GAGNE' && s.wonOn]} onPress={() => void setStatus(c, 'GAGNE')} disabled={busy === c.id}>
                      <Text style={[s.actText, { color: c.status === 'GAGNE' ? '#050505' : Colors.primaryGreen }]}>Gagné</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.act, s.lost, c.status === 'PERDU' && s.lostOn]} onPress={() => void setStatus(c, 'PERDU')} disabled={busy === c.id}>
                      <Text style={[s.actText, { color: c.status === 'PERDU' ? '#050505' : '#FF8A8A' }]}>Perdu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.iconAct} onPress={() => void shareCoupon(c)} accessibilityLabel="Partager sur les réseaux"><Share2 color={Colors.white} size={15} /></TouchableOpacity>
                    <TouchableOpacity style={s.iconAct} onPress={() => setToDelete(c)} accessibilityLabel="Supprimer"><Trash2 color="#BDBDBD" size={15} /></TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
      <TouchableOpacity style={[s.fab, { bottom: insets.bottom + 24 }]} onPress={() => router.push('/admin_coupons/new' as any)} activeOpacity={0.85}>
        <Plus color="#050505" size={20} strokeWidth={3} />
        <Text style={s.fabText}>Nouveau coupon</Text>
      </TouchableOpacity>
      <InfoModal
        visible={!!toDelete}
        onClose={() => setToDelete(null)}
        type="warning"
        title="Supprimer ce coupon ?"
        message="Il disparaîtra de l’accueil, de la liste des coupons et des notifications."
        confirmText="Supprimer"
        onConfirm={() => void remove()}
        secondaryText="Annuler"
        onSecondary={() => {}}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Colors.secondaryBg, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: 16, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  thumb: { width: 80, height: 104, borderRadius: 10, backgroundColor: '#1E1E1E' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  when: { color: Colors.white, fontSize: 13, fontWeight: '800', flexShrink: 1 },
  badge: { height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: 'center' },
  badgeText: { fontSize: 10, fontWeight: '900' },
  codes: { color: '#BDBDBD', fontSize: 12 },
  odds: { color: Colors.primaryGreen, fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 6, marginTop: 'auto' },
  act: { flex: 1, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  won: { borderColor: 'rgba(125,255,42,0.4)', backgroundColor: 'rgba(125,255,42,0.08)' },
  wonOn: { backgroundColor: Colors.primaryGreen, borderColor: Colors.primaryGreen },
  lost: { borderColor: 'rgba(255,107,107,0.4)' },
  lostOn: { backgroundColor: '#FF8A8A', borderColor: '#FF8A8A' },
  actText: { fontSize: 11, fontWeight: '800' },
  iconAct: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, height: 56, paddingHorizontal: 20, borderRadius: 28, backgroundColor: Colors.primaryGreen, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 6 },
  fabText: { color: '#050505', fontSize: 15, fontWeight: '900' },
});
