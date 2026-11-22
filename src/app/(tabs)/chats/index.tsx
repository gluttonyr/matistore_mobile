



















import Badge from '@/components/ui/Badge';
import { FadeIn } from '@/components/ui/FadeIn';
import { PressableScale } from '@/components/ui/PressableScale';
import { ConnectionErrorState } from '@/components/ui/ConnectionErrorState';
import { Colors } from '@/constants/colors';
import { Discussion, DiscussionType } from '@/data_api/models/discussion.types';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { discussionService } from '@/data_api/services/discussionService';
import { useAuth } from '@/hooks/useAuth';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeftRight,
  HeadphonesIcon,
  MessageCircle,
  Search
} from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Snowfall } from '@/components/christmas/Christmas';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ✅ Clés alignées sur DiscussionType enum
const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  [DiscussionType.SUPPORT]: {
    icon: <HeadphonesIcon color="#A78BFA" size={21} />,
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.14)',
  },
  [DiscussionType.DEPOT_RETRAIT]: {
    icon: <ArrowLeftRight color={Colors.primaryGreen} size={21} />,
    color: Colors.primaryGreen,
    bg: 'rgba(125,255,42,0.12)',
  },
  [DiscussionType.FORUM]: {
    icon: <MessageCircle color="#FFC94D" size={21} />,
    color: '#FFC94D',
    bg: 'rgba(255,201,77,0.14)',
  },
};

// Fallback si le type n'est pas reconnu
const defaultConfig = {
  icon: <MessageCircle color="#F5F5F5" size={21} />,
  color: '#F5F5F5',
  bg: 'rgba(255,255,255,0.07)',
};

// Formate la date ISO en heure lisible
function formatTime(isoDate?: string | null): string {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatsScreen() {
  const navigationInProgressRef = useRef(false);
  const [search, setSearch] = useState('');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth(); // ✅ Récupérez l'utilisateur connecté

  const fetchDiscussions = useCallback(async () => {
    if (!user?.trackingId) {
      return;
    }
    setError('');
    try {
      const response = await discussionService.getByUserId(user.trackingId);
      setDiscussions(response);
    } catch (err) {
      console.error('Failed to fetch discussions:', err);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Recharge la liste (et donc le dernier message) à chaque retour sur cet écran,
  // par ex. après avoir envoyé un message puis fait "retour" depuis une discussion.
  useFocusEffect(
    useCallback(() => {
      navigationInProgressRef.current = false;
      fetchDiscussions();
    }, [fetchDiscussions])
  );

  // ✅ Filtrage sur les vraies discussions (par titre)
  const filtered = discussions.filter((d) =>
    d.titre.toLowerCase().includes(search.toLowerCase())
  );

  const navigateToChat = (discussion: Discussion) => {
    if (navigationInProgressRef.current) return;
    navigationInProgressRef.current = true;
    if (discussion.type === DiscussionType.DEPOT_RETRAIT) {
      router.push({
        pathname: '/user_chats/deposit-withdrawal',
        params: { id: discussion.trackingId },  // ← ajoute ça
      });
    } else {
      router.push({
        pathname: '/user_chats/[id]',
        params: { id: discussion.trackingId, name: discussion.titre },
      });
    }
  };

  return (
    <View style={styles.container}>
      <Snowfall count={10} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search color={Colors.textSecondary} size={18} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une conversation..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Loader */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={Colors.primaryGreen} size="large" />
        </View>
      ) : error ? (
        <ConnectionErrorState onRetry={fetchDiscussions} fullscreen />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.trackingId}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune conversation trouvée</Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const config = typeConfig[item.type] ?? defaultConfig;
            const main = item.type === DiscussionType.DEPOT_RETRAIT;
            return (
              <FadeIn index={index}>
              <PressableScale
                style={[styles.convItem, main && styles.convItemMain]}
                onPress={() => navigateToChat(item)}
                accessibilityLabel={item.titre}
              >
                <View style={[styles.avatarContainer, { backgroundColor: config.bg }]}>
                  {config.icon}
                </View>
                <View style={styles.convContent}>
                  <View style={styles.convHeader}>
                    <Text style={styles.convName}>{item.titre}</Text>
                    <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
                  </View>
                  <View style={styles.convFooter}>
                    <Text style={styles.convLastMsg} numberOfLines={1}>
                      {item.lastMessageContent ?? 'Aucun message'}
                    </Text>
                    {/* Badge unread : à brancher si votre API le fournit */}
                    <Badge count={0} />
                  </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 16,
  },
  headerTitle: { color: Colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -0.3 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0E0E',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 16,
    height: 50,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
  },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
  listContent: { paddingBottom: 20, paddingHorizontal: 14, gap: 4 },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 12,
  },
  convItemMain: { backgroundColor: '#0E0E0E', borderWidth: 1, borderColor: 'rgba(125,255,42,0.22)' },
  avatarContainer: {
    width: 52, height: 52, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  convContent: { flex: 1 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  convTime: { color: Colors.textSecondary, fontSize: 12 },
  convFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convLastMsg: { flex: 1, color: Colors.textSecondary, fontSize: 13, marginRight: 8 },
});
