import { Colors } from '@/constants/colors';
import type { Coupon } from '@/data_api/models/coupon.types';
import { couponService } from '@/data_api/services/couponService';
import { socketService } from '@/data_api/services/socketService';
import { router, useFocusEffect } from 'expo-router';
import { Ticket } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CouponTicket, formatTime } from './CouponTicket';

/** "Coupons du jour" on the client home: today's tickets, or the last ones when none yet. */
export function CouponsHomeSection() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [today, setToday] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    const load = () => couponService.home()
      .then((data) => { if (active) { setItems(data.items); setToday(data.today); } })
      .catch(() => {});
    void load();
    const socket = socketService.getSocket();
    socket?.on('couponsChanged', load);
    return () => { active = false; socket?.off('couponsChanged', load); };
  }, []));

  if (!items.length) return null;
  const open = (c: Coupon) => router.push({ pathname: '/coupons/[id]', params: { id: c.id } } as any);

  return (
    <View style={s.section}>
      <View style={s.header}>
        <View style={s.icon}><Ticket color="#050505" size={18} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Coupons du jour</Text>
          <Text style={s.sub}>
            {today ? `${items.length} aujourd’hui · mis à jour à ${formatTime(items[0].createdAt)}` : 'Les derniers coupons publiés'}
          </Text>
        </View>
        <TouchableOpacity style={s.all} onPress={() => router.push('/coupons' as any)} accessibilityRole="button">
          <Text style={s.allText}>Tout voir</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} snapToInterval={302} decelerationRate="fast">
        {items.map((c) => <CouponTicket key={c.id} coupon={c} compact onOpen={() => open(c)} />)}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 18, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '900' },
  sub: { color: Colors.textSecondary, fontSize: 12 },
  all: { height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(125,255,42,0.4)', justifyContent: 'center' },
  allText: { color: Colors.primaryGreen, fontSize: 12, fontWeight: '800' },
});
