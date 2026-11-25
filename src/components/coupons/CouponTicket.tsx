import { Colors } from '@/constants/colors';
import type { Bookmaker } from '@/data_api/models/bookmaker.types';
import type { Coupon, CouponStatus } from '@/data_api/models/coupon.types';
import { bookmakerService } from '@/data_api/services/bookmakerService';
import { resolveFileUrl } from '@/hooks/useFileUrl';
import { PLAY_STORE_URL } from '@/components/referral/referralUi';
import { Copy, Maximize2, Share2, Ticket } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { copyText } from '@/utils/copyText';
import Toast from 'react-native-toast-message';

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const STATUS: Record<CouponStatus, { label: string; bg: string; fg: string }> = {
  EN_COURS: { label: 'EN COURS', bg: '#FFB733', fg: '#050505' },
  GAGNE: { label: 'GAGNÉ', bg: Colors.primaryGreen, fg: '#050505' },
  PERDU: { label: 'PERDU', bg: '#3A1414', fg: '#FF8A8A' },
};

// Bookmaker logos, loaded once (notification coupons carry only the code).
let logoCache: Record<string, Bookmaker> | null = null;
let logoPromise: Promise<Record<string, Bookmaker>> | null = null;
export function useBookmakers() {
  const [books, setBooks] = useState<Record<string, Bookmaker>>(logoCache ?? {});
  useEffect(() => {
    if (logoCache) return;
    logoPromise ??= bookmakerService.getAll()
      .then((list) => (logoCache = Object.fromEntries(list.map((b) => [b.code, b]))))
      .catch(() => ({}));
    let active = true;
    void logoPromise.then((map) => { if (active) setBooks(map); });
    return () => { active = false; };
  }, []);
  return books;
}

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function copyCouponCode(bookmaker: string, code: string) {
  void copyText(code);
  Toast.show({ type: 'success', text1: `Code ${bookmaker} copié`, text2: code });
}

export async function shareCoupon(coupon: Coupon) {
  const lines = [
    `🎟️ Coupon du jour Matistore n°${coupon.number}`,
    coupon.odds ? `Cote ${coupon.odds}` : null,
    ...coupon.codes.map((c) => `${c.name ?? c.bookmaker} : ${c.code}`),
    '',
    coupon.imageUrl,
    '',
    `Dépôts et retraits instantanés sur Matistore : ${PLAY_STORE_URL}`,
  ].filter((l) => l !== null);
  const message = lines.join('\n');
  try {
    if (Platform.OS === 'web') {
      if ((navigator as any).share) await (navigator as any).share({ text: message });
      else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      return;
    }
    await Share.share(Platform.OS === 'ios' ? { message, url: coupon.imageUrl } : { message });
  } catch {
    void copyText(message);
    Toast.show({ type: 'info', text1: 'Coupon copié', text2: 'Collez-le dans l’application de votre choix.' });
  }
}

export function StatusBadge({ status, small }: { status: CouponStatus; small?: boolean }) {
  const s = STATUS[status] ?? STATUS.EN_COURS;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (status !== 'EN_COURS') return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.55, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, status]);
  return (
    <Animated.View style={[t.badge, small && { height: 22, paddingHorizontal: 8 }, { backgroundColor: s.bg, opacity: status === 'EN_COURS' ? pulse : 1 }]}>
      <Text style={[t.badgeText, { color: s.fg }, small && { fontSize: 10 }]}>{s.label}</Text>
    </Animated.View>
  );
}

/** One code: the bookmaker's logo and the code; touching it copies the code. */
export function CodeRow({ bookmaker, code, logo, name, size = 'm' }: { bookmaker: string; code: string; logo?: string | null; name?: string; size?: 's' | 'm' | 'l' }) {
  const books = useBookmakers();
  const uri = resolveFileUrl('bookmakers', logo ?? books[bookmaker]?.imageUrl);
  const label = name ?? books[bookmaker]?.nom ?? bookmaker;
  const dims = size === 'l' ? { w: 92, h: 46, f: 26 } : size === 's' ? { w: 66, h: 32, f: 18 } : { w: 80, h: 38, f: 22 };
  return (
    <TouchableOpacity
      style={t.codeRow}
      onPress={() => copyCouponCode(label, code)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Copier le code ${label} ${code}`}
    >
      {uri
        ? <Image source={{ uri }} style={{ width: dims.w, height: dims.h, borderRadius: 9 }} resizeMode="cover" />
        : <View style={[t.logoFallback, { width: dims.w, height: dims.h }]}><Text style={t.logoFallbackText}>{label}</Text></View>}
      <Text style={[t.code, { fontSize: dims.f }]} numberOfLines={1} adjustsFontSizeToFit>{code}</Text>
      <Copy color={Colors.primaryGreen} size={size === 's' ? 17 : 20} />
    </TouchableOpacity>
  );
}

/** Perforated line between the screenshot and the codes, with a notch on each side. */
function Perforation() {
  return (
    <View style={t.perf}>
      <View style={[t.notch, { left: -13 }]} />
      <View style={[t.notch, { right: -13 }]} />
      <View style={t.holes}>{Array.from({ length: 14 }, (_, i) => <View key={i} style={t.hole} />)}</View>
    </View>
  );
}

/** The "ticket néon": header, big screenshot, perforation, every code (tap to copy), share. */
export function CouponTicket({ coupon, compact, onZoom, onOpen }: {
  coupon: Coupon; compact?: boolean; onZoom?: () => void; onOpen?: () => void;
}) {
  return (
    <View style={[t.card, compact && { width: 290 }]}>
      {!compact && (
        <View style={t.header}>
          <View style={t.headerIcon}><Ticket color={Colors.primaryGreen} size={18} /></View>
          <View style={{ flex: 1 }}>
            <Text style={t.kicker}>COUPON N°{coupon.number}</Text>
            <Text style={t.meta} numberOfLines={1}>{formatTime(coupon.createdAt)}{coupon.note ? ` · ${coupon.note}` : ''}</Text>
          </View>
          {!!coupon.odds && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={t.oddsLabel}>COTE</Text>
              <Text style={t.odds}>{coupon.odds}</Text>
            </View>
          )}
        </View>
      )}
      <TouchableOpacity activeOpacity={0.9} onPress={onOpen ?? onZoom} style={[t.shot, compact && { height: 200, marginTop: 10 }]} accessibilityRole="imagebutton" accessibilityLabel="Voir la capture du coupon">
        <Image source={{ uri: coupon.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={t.shotBadge}><StatusBadge status={coupon.status} small={compact} /></View>
        {compact && !!coupon.odds ? (
          <View style={t.oddsChip}><Text style={t.oddsLabel}>COTE</Text><Text style={[t.odds, { fontSize: 17, lineHeight: 19 }]}>{coupon.odds}</Text></View>
        ) : (
          <TouchableOpacity style={t.zoomChip} onPress={onZoom} accessibilityRole="button" accessibilityLabel="Agrandir">
            <Maximize2 color={Colors.white} size={12} />
            <Text style={t.zoomText}>Agrandir</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {!compact && <Perforation />}
      <View style={[t.codes, compact && { paddingTop: 12 }]}>
        {coupon.codes.map((c) => <CodeRow key={c.bookmaker} {...c} size={compact ? 's' : 'm'} />)}
        <View style={t.footer}>
          <Text style={t.hint}>{compact ? formatTime(coupon.createdAt) : 'Touchez un code pour le copier'}</Text>
          <TouchableOpacity style={t.share} onPress={() => void shareCoupon(coupon)} accessibilityRole="button">
            <Share2 color={Colors.white} size={14} />
            <Text style={t.shareText}>Partager</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const t = StyleSheet.create({
  card: { borderRadius: 24, backgroundColor: '#0E120E', borderWidth: 1, borderColor: 'rgba(125,255,42,0.22)', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  headerIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(125,255,42,0.12)', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: '#B4FF7F', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  meta: { color: Colors.textSecondary, fontSize: 12 },
  oddsLabel: { color: '#8A8A8A', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  odds: { color: Colors.primaryGreen, fontSize: 24, fontWeight: '900', lineHeight: 26 },
  shot: { marginHorizontal: 12, height: 260, borderRadius: 18, overflow: 'hidden', backgroundColor: '#161616' },
  shotBadge: { position: 'absolute', left: 10, bottom: 10 },
  zoomChip: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.72)' },
  zoomText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  oddsChip: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'flex-end' },
  badge: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '900' },
  perf: { height: 26, marginTop: 6, justifyContent: 'center' },
  notch: { position: 'absolute', top: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.darkBg, borderWidth: 1, borderColor: 'rgba(125,255,42,0.22)' },
  holes: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 24 },
  hole: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#2A2A2A' },
  codes: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14, gap: 10 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, paddingLeft: 7, paddingRight: 12, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(125,255,42,0.5)', backgroundColor: 'rgba(125,255,42,0.05)' },
  logoFallback: { borderRadius: 9, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { color: Colors.white, fontSize: 10, fontWeight: '900' },
  code: { flex: 1, color: Colors.white, fontFamily: MONO, fontWeight: '800', letterSpacing: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { color: '#8A8A8A', fontSize: 11 },
  share: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  shareText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
});
