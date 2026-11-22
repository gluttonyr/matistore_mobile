import { useWideWeb } from '@/hooks/useWideWeb';
import { webSidebarStyles } from '@/components/webSidebarStyles';
import { Colors } from '@/constants/colors';
import type { Transaction, TransactionStatus } from '@/data_api/models/transaction.types';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { transactionService } from '@/data_api/services/transactionService';
import { socketService } from '@/data_api/services/socketService';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  CircleX,
  Clock3,
  Phone,
  Smartphone,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FadeIn } from '@/components/ui/FadeIn';
import type { ReactNode } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type StatusConfig = {
  label: string;
  description: string;
  color: string;
  step: number;
  terminal?: 'success' | 'error' | 'neutral';
};

const STATUS_CONFIG: Record<TransactionStatus, StatusConfig> = {
  EN_ATTENTE_AUTO: {
    label: 'Vérification automatique en cours',
    description: 'Nous vérifions votre paiement.',
    color: '#F59E0B',
    step: 1,
  },
  EN_VERIFICATION: {
    label: 'Vérification automatique en cours',
    description: 'Nous vérifions votre paiement.',
    color: '#38BDF8',
    step: 2,
  },
  EN_ATTENTE_PREUVE: {
    label: 'Dépôt à recommencer',
    description: 'Nous n’avons pas encore pu confirmer votre paiement. Nous vérifions votre demande avant que vous ne recommenciez.',
    color: '#F97316',
    step: 2,
  },
  EN_ATTENTE_ADMIN: {
    label: 'Paiement vérifié, en attente de validation',
    description: 'Votre paiement est confirmé. Nous finalisons le crédit de votre compte.',
    color: '#A78BFA',
    step: 2,
  },
  EN_RECLAMATION: {
    label: 'Réclamation en cours',
    description: 'Nous examinons votre demande. Vous recevrez une notification après vérification.',
    color: '#C084FC',
    step: 2,
  },
  VALIDEE: {
    label: 'Transaction validée',
    description: 'Le paiement a été confirmé avec succès.',
    color: Colors.primaryGreen,
    step: 3,
    terminal: 'success',
  },
  REJETEE: {
    label: 'Transaction refusée',
    description: 'La transaction n’a pas été acceptée.',
    color: '#F87171',
    step: 3,
    terminal: 'error',
  },
  ANNULEE: {
    label: 'Transaction annulée',
    description: 'Cette transaction a été annulée.',
    color: Colors.textSecondary,
    step: 3,
    terminal: 'neutral',
  },
};

const FLOW_STEPS = ['Demande', 'Vérification', 'Terminé'];

type Filter = 'ALL' | 'DEPOT' | 'RETRAIT' | 'PENDING';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'DEPOT', label: 'Dépôts' },
  { key: 'RETRAIT', label: 'Retraits' },
  { key: 'PENDING', label: 'En cours' },
];
const isPending = (t: Transaction) => !STATUS_CONFIG[t.statut]?.terminal;
type Row = { kind: 'day'; key: string; label: string } | { kind: 'tx'; key: string; item: Transaction };

function dayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'AUJOURD’HUI';
  if (d.toDateString() === yesterday.toDateString()) return 'HIER';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}
const fcfa = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');

export default function UserTransactionsScreen() {
  const { token } = useAuth();
  const wide = useWideWeb();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [claimTarget, setClaimTarget] = useState<Transaction | null>(null);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const loadRequestRef = useRef(0);
  const [filter, setFilter] = useState<Filter>('ALL');

  // This month's validated totals (from the transactions loaded so far).
  const month = useMemo(() => {
    const now = new Date();
    const inMonth = transactions.filter((t) => {
      const d = new Date(t.createdAt);
      return t.statut === 'VALIDEE' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const sum = (type: 'DEPOT' | 'RETRAIT') => inMonth.filter((t) => t.type === type).reduce((a, t) => a + (t.montant || 0), 0);
    const count = (type: 'DEPOT' | 'RETRAIT') => inMonth.filter((t) => t.type === type).length;
    return {
      name: now.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase(),
      deposit: sum('DEPOT'), deposits: count('DEPOT'), withdrawal: sum('RETRAIT'), withdrawals: count('RETRAIT'),
    };
  }, [transactions]);

  // Filtered list, grouped by day.
  const rows = useMemo<Row[]>(() => {
    const list = transactions.filter((t) => filter === 'ALL' || (filter === 'PENDING' ? isPending(t) : t.type === filter));
    const out: Row[] = [];
    let last = '';
    for (const item of list) {
      const d = new Date(item.createdAt);
      const key = d.toDateString();
      if (key !== last) { out.push({ kind: 'day', key: 'day-' + key, label: dayLabel(d) }); last = key; }
      out.push({ kind: 'tx', key: item.trackingId, item });
    }
    return out;
  }, [transactions, filter]);

  const submitClaim = async () => {
    if (!claimTarget || claimSubmitting) return;
    setClaimSubmitting(true);
    try {
      const claimed = await transactionService.claim(claimTarget.trackingId);
      setTransactions((current) => current.map((item) =>
        item.trackingId === claimed.trackingId ? claimed : item,
      ));
      setClaimTarget(null);
    } catch {
      Alert.alert('Réclamation impossible', 'Cette transaction ne peut plus être réclamée. Actualisez la liste pour voir son état.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const load = useCallback(async (requestedPage = 1, append = false) => {
    const requestId = ++loadRequestRef.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const result = await transactionService.getAll({ page: requestedPage, limit: 25 });
      if (requestId !== loadRequestRef.current) return;
      setTransactions((current) => {
        if (!append) return result.items;
        const byId = new Map(current.map((item) => [item.trackingId, item]));
        result.items.forEach((item) => byId.set(item.trackingId, item));
        return [...byId.values()];
      });
      setPage(requestedPage);
      setHasMore(result.hasMore);
    } catch (error) {
      if (requestId !== loadRequestRef.current) return;
      if (!append) Alert.alert('Erreur', getApiErrorMessage(error));
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token) return;
    socketService.connect(token);
    const socket = socketService.getSocket();
    if (!socket) return;
    const handleTransactionStatusChanged = () => load();
    socket.on('transactionStatusChanged', handleTransactionStatusChanged);
    return () => {
      socket.off('transactionStatusChanged', handleTransactionStatusChanged);
    };
  }, [load, token]);

  return (
    <View style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <ChevronLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Mes transactions</Text>
      </View>

      {loading ? (
        <View style={st.loader}>
          <ActivityIndicator color={Colors.primaryGreen} size="large" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          ListHeaderComponent={(
            <View style={st.headerBlock}>
              <View style={st.summaryRow}>
                <View style={[st.summaryTile, st.summaryTileGreen]}>
                  <Text style={[st.summaryLabel, { color: '#9BFF5C' }]}>DÉPOSÉ EN {month.name}</Text>
                  <Text style={st.summaryValue}>{fcfa(month.deposit)} <Text style={st.summaryUnit}>FCFA</Text></Text>
                  <Text style={st.summaryCount}>{month.deposits} dépôt{month.deposits > 1 ? 's' : ''}</Text>
                </View>
                <View style={st.summaryTile}>
                  <Text style={st.summaryLabel}>RETIRÉ EN {month.name}</Text>
                  <Text style={st.summaryValue}>{fcfa(month.withdrawal)} <Text style={st.summaryUnit}>FCFA</Text></Text>
                  <Text style={st.summaryCount}>{month.withdrawals} retrait{month.withdrawals > 1 ? 's' : ''}</Text>
                </View>
              </View>
              <View style={st.chips}>
                {FILTERS.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[st.chip, filter === key && st.chipOn]}
                    onPress={() => setFilter(key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === key }}
                  >
                    <Text style={[st.chipText, filter === key && st.chipTextOn]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          contentContainerStyle={[st.list, wide && webSidebarStyles.readable]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load(1);
              }}
              tintColor={Colors.primaryGreen}
            />
          }
          onEndReached={() => {
            if (hasMore && !loadingMore && !loading) void load(page + 1, true);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primaryGreen} style={{ padding: 16 }} /> : null}
          ListEmptyComponent={() => (
            <Text style={st.emptyText}>Aucune transaction pour le moment.</Text>
          )}
          renderItem={({ item: row, index }) => {
            if (row.kind === 'day') return <Text style={st.dayLabel}>{row.label}</Text>;
            const item = row.item;
            const config = item.type === 'RETRAIT' && item.statut === 'VALIDEE'
              ? {
                ...STATUS_CONFIG[item.statut],
                description: `Votre compte ${item.bookmaker || '1XBET'} a été débité${item.montant > 0 ? ` de ${item.montant.toLocaleString('fr-FR')} FCFA` : ''}. Votre retrait a été envoyé au numéro indiqué.`,
              }
              : item.type === 'DEPOT' && item.statut === 'EN_ATTENTE_PREUVE' && !!item.creditError
                ? {
                  ...STATUS_CONFIG[item.statut],
                  label: 'Crédit en vérification',
                  description: item.creditError,
                }
              : item.type === 'RETRAIT' && item.statut === 'EN_VERIFICATION'
              ? {
                ...STATUS_CONFIG[item.statut],
                label: 'Retrait en vérification',
                description: `Nous vérifions votre code de retrait et votre compte ${item.bookmaker || '1XBET'}.`,
              }
              : item.type === 'RETRAIT' && item.statut === 'REJETEE'
                ? {
                  ...STATUS_CONFIG[item.statut],
                  description: `Retrait refusé. ${item.motifRejet || 'La vérification n’a pas abouti.'}`,
                }
              : item.type === 'RETRAIT' && item.statut === 'EN_ATTENTE_PREUVE'
                ? {
                  ...STATUS_CONFIG[item.statut],
                  label: item.creditError?.toLocaleLowerCase().includes('code de retrait invalide') ? 'Code invalide' : 'Code de retrait à vérifier',
                  description: item.creditError || 'Le code n’a pas pu être confirmé. Ne le renvoyez pas pendant la vérification.',
                }
              : item.type === 'RETRAIT' && item.statut === 'EN_ATTENTE_ADMIN'
              ? {
                ...STATUS_CONFIG[item.statut],
                label: 'Compte débité · retrait à envoyer',
                  description: `Demande de retrait validée. Votre compte ${item.bookmaker || '1XBET'} a été débité${item.montant > 0 ? ` de ${item.montant.toLocaleString('fr-FR')} FCFA` : ''}. Patientez pendant la préparation de l’envoi au numéro indiqué.`,
              }
                : STATUS_CONFIG[item.statut];
            const date = new Date(item.createdAt);

            return (
              <FadeIn index={index}>
              <View style={st.card}>
                <View style={st.cardHeader}>
                  <View style={[st.typeIcon, { backgroundColor: item.type === 'DEPOT' ? 'rgba(125,255,42,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                    <Smartphone color={item.type === 'DEPOT' ? Colors.primaryGreen : '#F59E0B'} size={18} />
                  </View>
                  <View style={st.titleGroup}>
                    <Text style={st.cardType}>{item.type === 'DEPOT' ? 'Dépôt' : 'Retrait'} · {item.operateur || 'Mobile Money'}</Text>
                    <Text style={st.cardDate}>
                      {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' · '}
                      {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[st.cardAmount, { color: config.terminal === 'success' ? (item.type === 'DEPOT' ? '#9BFF5C' : Colors.white) : config.terminal ? Colors.textSecondary : Colors.white }]}>
                    {item.montant > 0 ? `${item.type === 'DEPOT' ? '+' : '−'}${fcfa(item.montant)} FCFA` : '—'}
                  </Text>
                </View>

                <View style={[st.statusPanel, { backgroundColor: `${config.color}12`, borderColor: `${config.color}45` }]}>
                  <View style={[st.statusIcon, { backgroundColor: `${config.color}20` }]}>
                    {config.terminal === 'success' ? (
                      <BadgeCheck color={config.color} size={20} />
                    ) : config.terminal === 'error' ? (
                      <CircleX color={config.color} size={20} />
                    ) : (
                      <Clock3 color={config.color} size={20} />
                    )}
                  </View>
                  <View style={st.statusCopy}>
                    <Text style={[st.statusTitle, { color: config.color }]}>{config.label}</Text>
                    <Text style={st.statusDescription}>{config.description}</Text>
                  </View>
                </View>

                <View style={st.progressRow}>
                  {FLOW_STEPS.map((label, index) => {
                    const step = index + 1;
                    const reached = step <= config.step;
                    const nextReached = step < FLOW_STEPS.length && step + 1 <= config.step;
                    const activeColor = config.terminal === 'error' || config.terminal === 'neutral'
                      ? config.color
                      : Colors.primaryGreen;
                    return (
                      <View key={label} style={st.progressItem}>
                        <View style={st.progressTrack}>
                          <View style={[st.progressLine, index === 0 && st.progressLineHidden, reached && { backgroundColor: activeColor }]} />
                          <View style={[st.progressLine, index === FLOW_STEPS.length - 1 && st.progressLineHidden, nextReached && { backgroundColor: activeColor }]} />
                          <View style={[st.progressDot, reached && { backgroundColor: activeColor, borderColor: activeColor }]}>
                            {reached && <Check color={Colors.darkBg} size={11} strokeWidth={3} />}
                          </View>
                        </View>
                        <Text style={[st.progressLabel, reached && { color: activeColor }]}>{label}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={st.details}>
                  {!!item.numeroTelephone && (
                    <TransactionDetail icon={<Phone color="#38BDF8" size={15} />} label="Numéro de téléphone" value={item.numeroTelephone} />
                  )}
                  {item.statut === 'REJETEE' && !!item.motifRejet && (
                    <View style={st.rejectionBox}>
                      <Text style={st.rejectionLabel}>Motif du refus</Text>
                      <Text style={st.rejectionText}>{item.motifRejet}</Text>
                    </View>
                  )}
                </View>

                {item.statut === 'REJETEE' && !item.dateTraitementReclamation && (
                  <TouchableOpacity style={st.claimButton} onPress={() => setClaimTarget(item)}>
                    <Text style={st.claimButtonText}>Réclamer cette transaction</Text>
                  </TouchableOpacity>
                )}

              </View>
              </FadeIn>
            );
          }}
        />
      )}
      <Modal
        visible={!!claimTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !claimSubmitting && setClaimTarget(null)}
      >
        <View style={st.modalBackdrop}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>Confirmer la réclamation</Text>
            <Text style={st.modalIntro}>Vérifiez le récapitulatif. Nous recevrons votre demande et les informations de cette transaction.</Text>
            {!!claimTarget && (
              <View style={st.claimSummary}>
                <Text style={st.summaryLine}>{claimTarget.type === 'DEPOT' ? 'Dépôt' : 'Retrait'} · {claimTarget.operateur || 'Transaction'}</Text>
                <Text style={st.summaryLine}>Date : {new Date(claimTarget.createdAt).toLocaleString('fr-FR')}</Text>
                {claimTarget.montant > 0 && <Text style={st.summaryLine}>Montant : {claimTarget.montant.toLocaleString('fr-FR')} FCFA</Text>}
                {!!claimTarget.numeroTelephone && <Text style={st.summaryLine}>Numéro : {claimTarget.numeroTelephone}</Text>}
                {!!claimTarget.motifRejet && <Text style={st.summaryReason}>Motif du refus : {claimTarget.motifRejet}</Text>}
              </View>
            )}
            <View style={st.modalButtons}>
              <TouchableOpacity
                style={st.modalCancel}
                disabled={claimSubmitting}
                onPress={() => setClaimTarget(null)}
              >
                <Text style={st.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.modalConfirm, claimSubmitting && st.buttonDisabled]}
                disabled={claimSubmitting}
                onPress={() => void submitClaim()}
              >
                {claimSubmitting
                  ? <ActivityIndicator color={Colors.darkBg} size="small" />
                  : <Text style={st.modalConfirmText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TransactionDetail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={st.detailRow}>
      <View style={st.detailIcon}>{icon}</View>
      <View style={st.detailCopy}>
        <Text style={st.detailLabel}>{label}</Text>
        <Text style={st.detailValue} selectable>{value}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.secondaryBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#161616', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  headerBlock: { gap: 14, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryTile: { flex: 1, padding: 14, borderRadius: 20, backgroundColor: '#0E0E0E', borderWidth: 1, borderColor: Colors.border, gap: 4 },
  summaryTileGreen: { borderColor: 'rgba(125,255,42,0.22)' },
  summaryLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  summaryValue: { color: Colors.white, fontSize: 19, fontWeight: '900' },
  summaryUnit: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  summaryCount: { color: Colors.textSecondary, fontSize: 11 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center' },
  chipOn: { backgroundColor: '#F5F5F5', borderColor: '#F5F5F5' },
  chipText: { color: '#D6D6D6', fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: '#050505', fontWeight: '800' },
  dayLabel: { color: '#8A8A8A', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 10, marginBottom: 2, marginLeft: 2 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#0E0E0E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
    gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleGroup: { flex: 1, gap: 3 },
  cardType: { color: Colors.white, fontWeight: '800', fontSize: 14 },
  cardDate: { color: Colors.textSecondary, fontSize: 11 },
  cardAmount: { color: Colors.primaryGreen, fontWeight: '900', fontSize: 16 },
  statusPanel: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 11 },
  statusIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, gap: 3 },
  statusTitle: { fontSize: 13, fontWeight: '800' },
  statusDescription: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15 },
  progressRow: { flexDirection: 'row', marginHorizontal: 4 },
  progressItem: { flex: 1, alignItems: 'center' },
  progressTrack: { height: 20, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  progressLine: { height: 2, flex: 1, backgroundColor: Colors.border },
  progressLineHidden: { backgroundColor: 'transparent' },
  progressDot: { position: 'absolute', width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  progressLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600', marginTop: 4 },
  details: { gap: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 13 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  detailCopy: { flex: 1, gap: 2 },
  detailLabel: { color: Colors.textSecondary, fontSize: 10 },
  detailValue: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  rejectionBox: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.25)', borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  rejectionLabel: { color: '#F87171', fontSize: 10, fontWeight: '700' },
  rejectionText: { color: Colors.white, fontSize: 12 },
  claimButton: { borderWidth: 1, borderColor: 'rgba(192,132,252,0.55)', backgroundColor: 'rgba(192,132,252,0.12)', borderRadius: 10, padding: 12, alignItems: 'center' },
  claimButtonText: { color: '#D8B4FE', fontWeight: '800', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: Colors.secondaryBg, borderRadius: 17, borderWidth: 1, borderColor: Colors.border, padding: 18, gap: 13 },
  modalTitle: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  modalIntro: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  claimSummary: { backgroundColor: Colors.cardBg, borderRadius: 12, padding: 12, gap: 7 },
  summaryLine: { color: Colors.white, fontSize: 12, lineHeight: 17 },
  summaryReason: { color: '#FCA5A5', fontSize: 12, lineHeight: 17, marginTop: 3 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 2 },
  modalCancel: { paddingHorizontal: 13, paddingVertical: 10 },
  modalCancelText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
  modalConfirm: { minWidth: 105, alignItems: 'center', backgroundColor: '#C084FC', borderRadius: 9, paddingHorizontal: 16, paddingVertical: 10 },
  modalConfirmText: { color: Colors.darkBg, fontSize: 13, fontWeight: '900' },
  buttonDisabled: { opacity: 0.55 },
});
