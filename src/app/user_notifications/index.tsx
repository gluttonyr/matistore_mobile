import { useWideWeb } from '@/hooks/useWideWeb';
import { webSidebarStyles } from '@/components/webSidebarStyles';
import { ChatBackground } from '@/components/ChatBackground';
import { ImagePreviewModal } from '@/components/ImagePreviewModel';
import { DateSeparator } from '@/components/dateSeparator';
import { formatDayLabel } from '@/components/chatGrouping';
import { Colors } from '@/constants/colors';
import type { AppNotification } from '@/data_api/models/appNotification.types';
import { notificationService } from '@/data_api/services/notificationService';
import { markNotificationsSeen } from '@/storage/appNotificationSeen';
import { useAuth } from '@/hooks/useAuth';
import { router, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Bell, ChevronLeft, ImageOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function NotificationImage({ uri, width, onPress }: { uri: string; width: number; onPress: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={[styles.image, styles.imageFallback, { width }]}>
        <ImageOff color={Colors.textSecondary} size={20} />
        <Text style={styles.imageFallbackText}>Image momentanément indisponible</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} accessibilityRole="button" accessibilityLabel="Aperçu de l’image">
      <Image
        source={{ uri }}
        style={[styles.image, { width }]}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </TouchableOpacity>
  );
}

type NotificationSection = {
  title: string;
  dateKey: string;
  data: AppNotification[];
};

export default function UserNotificationsScreen() {
  const { user } = useAuth();
  const wide = useWideWeb();
  const { width: windowWidth } = useWindowDimensions();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const itemsRef = useRef<AppNotification[]>([]);
  const cursorRef = useRef<number | null>(null);
  const hasMoreRef = useRef(false);
  const loadedOlderPagesRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const canLoadOlderRef = useRef(false);

  const sections = useMemo(() => {
    const sortedItems = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const grouped = new Map<string, NotificationSection>();

    for (const item of sortedItems) {
      const date = new Date(item.createdAt);
      const dateKey = Number.isNaN(date.getTime())
        ? `invalid-${item.createdAt}`
        : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      let section = grouped.get(dateKey);

      if (!section) {
        section = {
          title: Number.isNaN(date.getTime()) ? 'Date inconnue' : formatDayLabel(date),
          dateKey,
          data: [],
        };
        grouped.set(dateKey, section);
      }
      section.data.push(item);
    }

    return Array.from(grouped.values());
  }, [items]);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const page = await notificationService.getMinePage({ limit: 20 });
      const existingItems = itemsRef.current;
      const merged = Array.from(new Map(
        [...page.items, ...existingItems].map((item) => [item.trackingId, item]),
      ).values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      itemsRef.current = merged;
      setItems(merged);
      if (!loadedOlderPagesRef.current) {
        cursorRef.current = page.nextCursor;
        hasMoreRef.current = page.hasMore;
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      }
      if (user?.trackingId) {
        await markNotificationsSeen(user.trackingId, page.items.map((item) => item.createdAt));
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.trackingId]);

  const loadOlder = useCallback(async () => {
    const beforeId = cursorRef.current;
    if (!canLoadOlderRef.current || !hasMoreRef.current || beforeId === null || loadingMoreRef.current) return;
    canLoadOlderRef.current = false;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await notificationService.getMinePage({ limit: 20, beforeId });
      const merged = Array.from(new Map(
        [...itemsRef.current, ...page.items].map((item) => [item.trackingId, item]),
      ).values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      itemsRef.current = merged;
      setItems(merged);
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.hasMore;
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      loadedOlderPagesRef.current = true;
    } catch {
      setFailed(true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { type?: string };
      if (data.type === 'ADMIN_BROADCAST' || data.type === 'transaction') void load();
    });
    return () => subscription.remove();
  }, [load]);

  const renderItem = ({ item }: { item: AppNotification }) => (
    <View style={styles.messageWrap}>
      <View style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <View style={styles.messageIcon}>
            <Bell color={Colors.primaryGreen} size={15} />
          </View>
            <Text style={styles.sender}>Matistore</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
          {!!item.imageUrl && <NotificationImage uri={item.imageUrl} width={Math.min(windowWidth * 0.76, 400)} onPress={() => setPreviewUri(item.imageUrl!)} />}
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ChatBackground variant="default" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Retour">
          <ChevronLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>Messages de MatiStore</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.primaryGreen} size="large" /></View>
      ) : (
        <SectionList
          sections={sections}
          // react-native-web draws inverted SectionLists upside down: on the web the newest is simply on top
          inverted={Platform.OS !== 'web'}
          scrollEventThrottle={16}
          onScroll={(event) => {
            if (event.nativeEvent.contentOffset.y > 24) canLoadOlderRef.current = true;
          }}
          keyExtractor={(item) => item.trackingId}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, items.length === 0 && styles.emptyList, wide && webSidebarStyles.readable]}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <DateSeparator label={section.title} />}
          onEndReached={() => { if (hasMore && !loadingMore) void loadOlder(); }}
          onEndReachedThreshold={0.25}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primaryGreen} style={{ padding: 16 }} /> : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={Colors.primaryGreen}
              colors={[Colors.primaryGreen]}
              progressBackgroundColor={Colors.cardBg}
            />
          }
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Bell color={Colors.textSecondary} size={24} /></View>
              <Text style={styles.emptyTitle}>{failed ? 'Notifications indisponibles' : 'Aucune notification'}</Text>
              <Text style={styles.emptyText}>{failed ? 'Vérifiez votre connexion puis actualisez la page.' : 'Les messages envoyés par MatiStore apparaîtront ici.'}</Text>
              {failed && <TouchableOpacity onPress={() => void load()} style={styles.retryButton}><Text style={styles.retryText}>Réessayer</Text></TouchableOpacity>}
            </View>
          )}
        />
      )}
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} showDownload={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: Colors.secondaryBg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { padding: 3 },
  headerCopy: { gap: 2 },
  headerTitle: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 11 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 1, padding: 14, gap: 10 },
  emptyList: { justifyContent: 'center' },
  messageWrap: { width: '100%', alignItems: 'flex-start' },
  messageCard: { alignSelf: 'flex-start', maxWidth: '88%', padding: 13, borderRadius: 15, borderTopLeftRadius: 5, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  messageIcon: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(125,255,42,0.1)' },
  sender: { color: Colors.primaryGreen, fontSize: 11, fontWeight: '800' },
  date: { color: Colors.textSecondary, fontSize: 9, alignSelf: 'flex-end' },
  title: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  body: { color: Colors.white, fontSize: 13, lineHeight: 19 },
  image: { height: 210, borderRadius: 10, marginTop: 2, backgroundColor: Colors.cardBg },
  imageFallback: { alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: Colors.border },
  imageFallbackText: { color: Colors.textSecondary, fontSize: 11 },
  emptyState: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 24 },
  emptyIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: Colors.cardBg, marginBottom: 12 },
  emptyTitle: { color: Colors.white, fontSize: 15, fontWeight: '800', marginBottom: 5 },
  emptyText: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  retryButton: { marginTop: 14, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: Colors.cardBg },
  retryText: { color: Colors.primaryGreen, fontWeight: '700', fontSize: 12 },
});
