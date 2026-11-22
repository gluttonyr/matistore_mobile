



















import Badge from '@/components/ui/Badge';
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
    icon: <HeadphonesIcon color="#fff" size={20} />,
    color: '#4FC3F7',
    bg: '#1565C0',
  },
  [DiscussionType.DEPOT_RETRAIT]: {
    icon: <ArrowLeftRight color="#fff" size={20} />,
    color: Colors.primaryGreen,
    bg: '#1B5E20',
  },
  [DiscussionType.FORUM]: {
    icon: <MessageCircle color="#fff" size={20} />,
    color: '#CE93D8',
    bg: '#4A148C',
  },
};

// Fallback si le type n'est pas reconnu
const defaultConfig = {
  icon: <MessageCircle color="#fff" size={20} />,
  color: '#CE93D8',
  bg: '#4A148C',
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
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune conversation trouvée</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const config = typeConfig[item.type] ?? defaultConfig;
            return (
              <TouchableOpacity
                style={styles.convItem}
                onPress={() => navigateToChat(item)}
                activeOpacity={0.75}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: { color: Colors.white, fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 14,
    paddingVertical: 12,
  },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
  listContent: { paddingBottom: 20 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 80 },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  avatarContainer: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  convContent: { flex: 1 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  convTime: { color: Colors.textSecondary, fontSize: 12 },
  convFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convLastMsg: { flex: 1, color: Colors.textSecondary, fontSize: 13, marginRight: 8 },
});
