import { ImagePreviewModal } from '@/components/ImagePreviewModel';
import { CodeRow, StatusBadge, formatTime, shareCoupon } from '@/components/coupons/CouponTicket';
import { Colors } from '@/constants/colors';
import type { Coupon } from '@/data_api/models/coupon.types';
import { couponService } from '@/data_api/services/couponService';
import { router, useLocalSearchParams } from 'expo-router';
import { Maximize2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CouponDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [missing, setMissing] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!id) return;
    couponService.get(id).then(setCoupon).catch(() => setMissing(true));
  }, [id]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/coupons' as any))} accessibilityRole="button" accessibilityLabel="Fermer">
          <X color={Colors.white} size={18} />
        </TouchableOpacity>
        {coupon && (
          <>
            <View style={{ flex: 1 }}>
              <Text style={s.kicker}>COUPON N°{coupon.number} · {formatTime(coupon.createdAt)}</Text>
              {!!coupon.note && <Text style={s.note} numberOfLines={1}>{coupon.note}</Text>}
            </View>
            {!!coupon.odds && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.oddsLabel}>COTE</Text>
                <Text style={s.odds}>{coupon.odds}</Text>
              </View>
            )}
          </>
        )}
      </View>
      {!coupon ? (
        missing
          ? <Text style={s.missing}>Ce coupon n’existe plus.</Text>
          : <ActivityIndicator color={Colors.primaryGreen} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <TouchableOpacity activeOpacity={0.9} style={s.shot} onPress={() => setZoom(true)} accessibilityRole="imagebutton" accessibilityLabel="Agrandir la capture">
            <Image source={{ uri: coupon.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            <View style={{ position: 'absolute', left: 12, top: 12 }}><StatusBadge status={coupon.status} /></View>
            <View style={s.zoom}><Maximize2 color={Colors.white} size={13} /><Text style={s.zoomText}>Agrandir</Text></View>
          </TouchableOpacity>
          <View style={s.sheet}>
            <Text style={s.hint}>Touchez un code pour le copier</Text>
            {coupon.codes.map((c) => <CodeRow key={c.bookmaker} {...c} size="l" />)}
            <View style={s.actions}>
              <TouchableOpacity style={s.secondary} onPress={() => void shareCoupon(coupon)} activeOpacity={0.85}>
                <Text style={s.secondaryText}>Partager sur les réseaux</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.primary} onPress={() => router.push('/(tabs)/home' as any)} activeOpacity={0.85}>
                <Text style={s.primaryText}>Faire un dépôt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
      <ImagePreviewModal uri={zoom && coupon ? coupon.imageUrl : null} onClose={() => setZoom(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: '#B4FF7F', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  note: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  oddsLabel: { color: '#8A8A8A', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  odds: { color: Colors.primaryGreen, fontSize: 24, fontWeight: '900', lineHeight: 26 },
  missing: { color: Colors.textSecondary, textAlign: 'center', marginTop: 60 },
  shot: { marginHorizontal: 14, height: 460, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  zoom: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.72)' },
  zoomText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  sheet: { marginTop: 14, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#0E0E0E', borderTopWidth: 1, borderColor: 'rgba(125,255,42,0.35)', gap: 12 },
  hint: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondary: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  primary: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(125,255,42,0.4)', backgroundColor: 'rgba(125,255,42,0.1)', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: Colors.primaryGreen, fontSize: 13, fontWeight: '800' },
});
