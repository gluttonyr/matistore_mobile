import { useWideWeb } from '@/hooks/useWideWeb';
import { webSidebarStyles } from '@/components/webSidebarStyles';
import { Colors } from '@/constants/colors';
import { InfoModal } from '@/components/infomodal';
import type { AdminCaptureStatus, Transaction, TransactionStatus } from '@/data_api/models/transaction.types';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { transactionService } from '@/data_api/services/transactionService';
import { operateurService } from '@/data_api/services/operateurService';
import type { Operateur } from '@/data_api/models/operateur.types';
import { dialUssd } from '@/modules/expo-ussd-dialer';
import { hasNotificationAccess, openNotificationSettings } from '@/modules/expo-notif-capture';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, ChevronLeft, Clock3, Copy, Phone, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { socketService } from '@/data_api/services/socketService';
import { useAuth } from '@/hooks/useAuth';
import Toast from 'react-native-toast-message';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STATUS_LABEL: Record<TransactionStatus, string> = {
  EN_ATTENTE_AUTO: 'Vérification automatique en cours',
  EN_VERIFICATION: 'Vérification automatique en cours',
  EN_ATTENTE_PREUVE: 'Réponse en attente',
  EN_ATTENTE_ADMIN: 'En attente de paiement admin',
  EN_RECLAMATION: 'Réclamation à traiter',
  VALIDEE: 'Validée',
  REJETEE: 'Rejetée',
  ANNULEE: 'Annulée',
};

const STATUS_COLOR: Record<TransactionStatus, string> = {
  EN_ATTENTE_AUTO: '#F59E0B',
  EN_VERIFICATION: '#38BDF8',
  EN_ATTENTE_PREUVE: '#F97316',
  EN_ATTENTE_ADMIN: '#A78BFA',
  EN_RECLAMATION: '#C084FC',
  VALIDEE: Colors.primaryGreen,
  REJETEE: '#F87171',
  ANNULEE: Colors.textSecondary,
};

const STATUS_STEP: Record<TransactionStatus, number> = {
  EN_ATTENTE_AUTO: 1,
  EN_VERIFICATION: 2,
  EN_ATTENTE_PREUVE: 2,
  EN_ATTENTE_ADMIN: 2,
  EN_RECLAMATION: 2,
  VALIDEE: 3,
  REJETEE: 3,
  ANNULEE: 3,
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

export default function AdminTransactionsScreen() {
  const { discussionId, clientName } = useLocalSearchParams<{ discussionId?: string; clientName?: string }>();
  const { token, logout } = useAuth();
  const wide = useWideWeb();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'DEPOT' | 'RETRAIT'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [transactionCounts, setTransactionCounts] = useState({ claims: 0, captureReconciliation: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [expandedTransaction, setExpandedTransaction] = useState<Transaction | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [operators, setOperators] = useState<Operateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<AdminCaptureStatus | null>(null);
  const previousCaptureStatus = useRef<AdminCaptureStatus | null>(null);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [withdrawalToValidate, setWithdrawalToValidate] = useState<Transaction | null>(null);
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [captureToValidate, setCaptureToValidate] = useState<Transaction | null>(null);
  const [transactionToReject, setTransactionToReject] = useState<Transaction | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const hasLoadedTransactionsRef = useRef(false);
  const loadRequestRef = useRef(0);
  const pendingClaimCount = transactionCounts.claims;
  const pendingCaptureReconciliationCount = transactionCounts.captureReconciliation;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (requestedPage = 1, append = false) => {
    const requestId = ++loadRequestRef.current;
    if (append) setLoadingMore(true);
    else if (!hasLoadedTransactionsRef.current) setLoading(true);
    try {
      const result = await transactionService.getAllForAdmin({
        page: requestedPage,
        limit: 25,
        search: debouncedSearch,
        type: typeFilter,
        status: statusFilter,
        discussionId: typeof discussionId === 'string' ? discussionId : undefined,
      });
      if (requestId !== loadRequestRef.current) return;
      setTransactions((current) => {
        if (!append) return result.items;
        const byId = new Map(current.map((item) => [item.trackingId, item]));
        result.items.forEach((item) => byId.set(item.trackingId, item));
        return [...byId.values()];
      });
      hasLoadedTransactionsRef.current = true;
      setTransactionCounts(result.counts ?? { claims: 0, captureReconciliation: 0 });
      setPage(requestedPage);
      setHasMore(result.hasMore);
    } catch (error) {
      if (requestId !== loadRequestRef.current) return;
      Alert.alert('Erreur', getApiErrorMessage(error));
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, discussionId, statusFilter, typeFilter]);

  const openTransactionDetails = async (item: Transaction) => {
    if (expandedTransactionId === item.trackingId) {
      setExpandedTransactionId(null);
      setExpandedTransaction(null);
      return;
    }
    setExpandedTransactionId(item.trackingId);
    setExpandedTransaction(null);
    setDetailLoading(true);
    try {
      setExpandedTransaction(await transactionService.getById(item.trackingId));
    } catch {
      setExpandedTransactionId(null);
      Alert.alert('Erreur', 'Impossible de charger le détail de cette transaction.');
    } finally {
      setDetailLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    load();
    operateurService.getAll().then(setOperators).catch(() => setOperators([]));
    let active = true;
    const refreshCaptureStatus = () => transactionService.getCaptureStatus()
      .then((status) => {
        if (!active) return;
        const previous = previousCaptureStatus.current;
        previousCaptureStatus.current = status;
        setCaptureStatus(status);
        if (previous && (previous.deviceAvailable !== status.deviceAvailable || previous.manualOverride !== status.manualOverride)) load();
      })
      .catch(() => { if (active) setCaptureStatus(null); });
    void refreshCaptureStatus();
    const timer = setInterval(() => { void refreshCaptureStatus(); }, 15_000);
    return () => { active = false; clearInterval(timer); };
  }, [load]));

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

  const isOpen = (transaction: Transaction) =>
    !['VALIDEE', 'REJETEE', 'ANNULEE'].includes(transaction.statut);

  const getWithdrawalUssd = (item: Transaction) => {
    const operator = operators.find((candidate) => candidate.nom === item.operateur);
    const template = operator?.formatRetraitUssd?.trim();
    const phone = item.numeroTelephone?.replace(/\D/g, '') ?? '';
    if (!template || !phone || item.montant <= 0) return null;
    return template.replace(/\{numero\}/g, phone).replace(/\{montant\}/g, String(item.montant));
  };

  const markWithdrawalPaid = (item: Transaction) => {
    setWithdrawalToValidate(item);
  };

  const confirmWithdrawalPaid = async (item: Transaction) => {
    if (withdrawalSubmitting) return;
    setWithdrawalSubmitting(true);
    try {
      await transactionService.validateManualWithdrawal(item.trackingId);
      void load();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Validation impossible',
        text2: 'Le retrait n’a pas pu être validé. Actualisez la liste.',
      });
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  const validateClaim = async (transaction: Transaction) => {
    if (claimSubmitting) return;
    setClaimSubmitting(true);
    try {
      await transactionService.resolveClaim(transaction.trackingId, { decision: 'VALIDEE' });
      void load();
    } catch {
      Alert.alert('Erreur', 'La réclamation n’a pas pu être validée. Actualisez la liste.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const rejectTransaction = async () => {
    if (!transactionToReject || rejectSubmitting) return;
    setRejectSubmitting(true);
    try {
      await transactionService.rejectUnvalidated(transactionToReject.trackingId);
      setTransactionToReject(null);
      load();
    } catch {
      Alert.alert('Erreur', 'La transaction n’a pas pu être refusée. Elle a peut-être déjà été validée. Actualisez la liste.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const restoreCapture = () => {
    if (!hasNotificationAccess()) {
      openNotificationSettings();
      return;
    }
    Alert.alert(
      'Reconnecter le téléphone admin',
      'La session de capture peut avoir expiré. Reconnectez-vous pour renouveler la configuration du listener.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Me déconnecter', onPress: () => { void logout(); } },
      ],
    );
  };

  const reconcileCapture = (item: Transaction) => {
    setCaptureToValidate(item);
  };

  const confirmCaptureReconciliation = async (item: Transaction) => {
    try {
      await transactionService.resolveCaptureReconciliation(item.trackingId, 'VALIDEE');
      void load();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Validation impossible',
        text2: 'Le rapprochement n’a pas pu être enregistré. Actualisez la liste.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{discussionId ? 'Transactions reçues' : 'Transactions'}</Text>
          {!!discussionId && !!clientName && <Text style={styles.headerSubtitle}>{clientName}</Text>}
          {!discussionId && pendingClaimCount > 0 && <Text style={styles.claimCount}>{pendingClaimCount} réclamation(s) à traiter</Text>}
          {!discussionId && pendingCaptureReconciliationCount > 0 && <Text style={styles.captureReconciliationCount}>{pendingCaptureReconciliationCount} dépôt(s) à rapprocher</Text>}
        </View>
        {!discussionId && <ShieldCheck color={captureStatus?.available ? Colors.primaryGreen : Colors.textSecondary} size={21} />}
      </View>

      {!discussionId && (
        <View style={[styles.capturePanel, captureStatus?.available && styles.captureBannerActive]}>
          <View style={styles.captureBanner}>
            <View style={[styles.captureDot, captureStatus?.available && styles.captureDotActive]} />
            <Text style={styles.captureText}>
              {Platform.OS !== 'android'
                ? 'La capture automatique nécessite un téléphone Android admin'
                : captureStatus?.available
                  ? captureStatus.manualOverride && !captureStatus.deviceAvailable
                    ? 'Dépôts ouverts manuellement · capture inactive'
                    : 'Capture Android confirmée active'
                  : captureStatus?.reason === 'notification_access_required' || !hasNotificationAccess()
                    ? 'Autorisation de capture à rétablir sur ce téléphone'
                    : captureStatus?.reason === 'capture_not_configured'
                      ? 'Configuration de capture incomplète'
                      : captureStatus
                        ? 'Téléphone de capture silencieux ou hors ligne'
                        : 'État de capture inconnu · dépôts bloqués par sécurité'}
            </Text>
          </View>
          {!!captureStatus?.lastHeartbeatAt && (
            <Text style={styles.captureLastSeen}>Dernier signal : {formatDateTime(captureStatus.lastHeartbeatAt)}</Text>
          )}
          {Platform.OS === 'android' && !captureStatus?.deviceAvailable && (
            <TouchableOpacity style={styles.captureAction} onPress={restoreCapture}>
              <Text style={styles.captureActionText}>{!hasNotificationAccess() ? 'Réautoriser les notifications' : 'Reconnecter le téléphone admin'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!discussionId && (
        <View style={styles.filters}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher client, téléphone, référence…"
            placeholderTextColor={Colors.textSecondary}
            style={styles.searchInput}
            returnKeyType="search"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {([
              ['all', 'Tous les types'],
              ['DEPOT', 'Dépôts'],
              ['RETRAIT', 'Retraits'],
            ] as const).map(([value, label]) => (
              <TouchableOpacity key={value} style={[styles.filterChip, typeFilter === value && styles.filterChipActive]} onPress={() => setTypeFilter(value)}>
                <Text style={[styles.filterChipText, typeFilter === value && styles.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {([
              ['all', 'Tous les statuts'],
              ['EN_RECLAMATION', 'Réclamation'],
              ['EN_ATTENTE_ADMIN', 'En attente admin'],
              ['EN_ATTENTE_PREUVE', 'À vérifier'],
              ['EN_ATTENTE_AUTO', 'Vérification auto'],
              ['EN_VERIFICATION', 'Vérification'],
              ['VALIDEE', 'Validées'],
              ['REJETEE', 'Refusées'],
              ['ANNULEE', 'Annulées'],
            ] as const).map(([value, label]) => (
              <TouchableOpacity key={value} style={[styles.filterChip, statusFilter === value && styles.filterChipActive]} onPress={() => setStatusFilter(value)}>
                <Text style={[styles.filterChipText, statusFilter === value && styles.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.primaryGreen} size="large" /></View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.trackingId}
          contentContainerStyle={[styles.list, wide && webSidebarStyles.readable]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1); }} tintColor={Colors.primaryGreen} />}
          onEndReached={() => { if (hasMore && !loadingMore && !loading) void load(page + 1, true); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primaryGreen} style={{ padding: 16 }} /> : null}
          ListEmptyComponent={<Text style={styles.empty}>{discussionId ? 'Aucune transaction liée à cette discussion.' : 'Aucune transaction.'}</Text>}
          renderItem={({ item }) => {
            const isExpanded = expandedTransactionId === item.trackingId && !!expandedTransaction;
            const transaction = expandedTransaction?.trackingId === item.trackingId ? expandedTransaction : item;
            return (
            <View style={[styles.card, { borderLeftColor: STATUS_COLOR[item.statut] }]}>
              <View style={styles.cardHeading}>
                <View style={[styles.typeIcon, { backgroundColor: item.type === 'DEPOT' ? 'rgba(125,255,42,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                  <Smartphone color={item.type === 'DEPOT' ? Colors.primaryGreen : '#F59E0B'} size={18} />
                </View>
                <View style={styles.cardHeadingCopy}>
                  <Text style={styles.cardTitle}>{item.type === 'DEPOT' ? 'Dépôt' : 'Retrait'} · {item.operateur || 'Mobile Money'}</Text>
                  <Text style={styles.cardSubtitle}>{formatDateTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.cardAmount}>
                  {item.montant > 0 ? `${item.montant.toLocaleString('fr-FR')} FCFA` : 'Montant non renseigné'}
                </Text>
              </View>

              <View style={[styles.statusPanel, { borderColor: `${STATUS_COLOR[item.statut]}55`, backgroundColor: `${STATUS_COLOR[item.statut]}12` }]}>
                {item.statut === 'VALIDEE' ? <BadgeCheck color={STATUS_COLOR[item.statut]} size={19} /> : <Clock3 color={STATUS_COLOR[item.statut]} size={19} />}
                <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: item.captureReconciliationRequired ? '#FBBF24' : STATUS_COLOR[item.statut] }]}>{item.captureReconciliationRequired ? 'À rapprocher manuellement' : item.creditError ? 'Réponse Servcul à vérifier' : STATUS_LABEL[item.statut]}</Text>
                  <Text style={styles.cardSubtitle}>Étape {STATUS_STEP[item.statut]} sur 3 · Mis à jour {formatDateTime(item.updatedAt)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.detailsToggle} onPress={() => void openTransactionDetails(item)}>
                {detailLoading && expandedTransactionId === item.trackingId
                  ? <ActivityIndicator color={Colors.primaryGreen} size="small" />
                  : <Text style={styles.detailsToggleText}>{isExpanded ? 'Masquer les détails' : 'Afficher les détails'}</Text>}
              </TouchableOpacity>

              {isExpanded && (
              <View style={styles.details}>
                {!!transaction.numeroTelephone && <Detail label="Numéro de téléphone" value={transaction.numeroTelephone} />}
                {!!transaction.compteDestinataire && <Detail label="Compte 1XBET destinataire" value={transaction.compteDestinataire} />}
                {!!transaction.codeRetrait && <Detail label="Code de retrait 1XBET" value={transaction.codeRetrait} />}
                {!!transaction.referenceClient && <Detail label="Référence déclarée par le client" value={transaction.referenceClient} />}
                {!!transaction.referencePaiement && <Detail label="Référence confirmée" value={transaction.referencePaiement} />}
                {!!transaction.dateValidation && <Detail label="Date de traitement" value={formatDateTime(transaction.dateValidation)} />}
                {!!transaction.dateReclamation && <Detail label="Date de réclamation" value={formatDateTime(transaction.dateReclamation)} />}
                {!!transaction.dateTraitementReclamation && <Detail label="Date de décision" value={formatDateTime(transaction.dateTraitementReclamation)} />}
                {!!transaction.motifRejet && <Detail label="Motif du refus" value={transaction.motifRejet} />}
                {!!transaction.creditError && <Detail label="Détail Servcul" value={transaction.creditError} />}
                {!!transaction.preuveFichier && <Detail label="Preuve de paiement" value={transaction.preuveFichier} />}
                {!!transaction.notificationBruteClient && <Detail label="Notification déclarée" value={transaction.notificationBruteClient} />}
                {!!transaction.notificationBrute && <Detail label="Notification de paiement" value={transaction.notificationBrute} />}
              </View>
              )}

              {transaction.type === 'RETRAIT' && transaction.statut === 'EN_ATTENTE_ADMIN' && (() => {
                const ussd = getWithdrawalUssd(transaction);
                return (
                  <View style={styles.captureReconciliationActions}>
                    <Text style={styles.captureReconciliationHint}>Le compte 1XBET du client a été débité. Envoyez le montant au numéro indiqué, puis validez le retrait.</Text>
                    {ussd ? (
                      <View style={styles.claimModalActions}>
                        <TouchableOpacity style={styles.editStepButton} onPress={() => Clipboard.setString(ussd)}>
                          <Text style={styles.editStepText}>Copier le code</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editStepButton} onPress={() => {
                          if (Platform.OS !== 'android') {
                            Alert.alert('Android requis', 'La composition USSD doit être lancée depuis le téléphone Android admin.');
                            return;
                          }
                          void dialUssd(ussd).catch(() => Alert.alert('Erreur', 'Impossible d’ouvrir le code USSD sur cet appareil.'));
                        }}>
                          <Text style={styles.editStepText}>Effectuer le paiement</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.cardSubtitle}>Format USSD de retrait non configuré pour cet opérateur. Effectuez le paiement manuellement.</Text>
                    )}
                    <TouchableOpacity style={styles.approveClaimButton} onPress={() => markWithdrawalPaid(transaction)}>
                      <Text style={styles.approveClaimText}>Valider le retrait</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}

              {transaction.statut === 'EN_RECLAMATION' && (
                <TouchableOpacity
                  style={styles.resolveClaimButton}
                  disabled={claimSubmitting}
                  onPress={() => { void validateClaim(transaction); }}
                >
                  {claimSubmitting
                    ? <ActivityIndicator color="#D8B4FE" size="small" />
                    : <Text style={styles.resolveClaimText}>Valider la réclamation</Text>}
                </TouchableOpacity>
              )}
              {transaction.captureReconciliationRequired && (
                <View style={styles.captureReconciliationActions}>
                  <Text style={styles.captureReconciliationHint}>Capture interrompue pendant ce dépôt. Vérifiez les paiements reçus et créditez les comptes manuellement avant de clôturer.</Text>
                  <View style={styles.claimModalActions}>
                    <TouchableOpacity style={styles.approveClaimButton} onPress={() => reconcileCapture(transaction)}>
                      <Text style={styles.approveClaimText}>Valider manuellement</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {isOpen(transaction) && (
                <TouchableOpacity
                  style={styles.rejectTransactionButton}
                  onPress={() => setTransactionToReject(transaction)}
                >
                  <Text style={styles.rejectText}>
                    {transaction.statut === 'EN_RECLAMATION' ? 'Refuser la réclamation' : 'Refuser la transaction'}
                  </Text>
                </TouchableOpacity>
              )}
              {isOpen(transaction) && <Text style={styles.cardSubtitle}>{transaction.statut === 'EN_RECLAMATION' ? 'Une décision administrateur est requise.' : transaction.type === 'RETRAIT' && transaction.statut === 'EN_ATTENTE_ADMIN' ? 'Paiement Mobile Money à effectuer par un administrateur.' : transaction.creditError ? 'Aucune nouvelle tentative automatique ne sera lancée.' : 'Traitement automatique en cours'}</Text>}
            </View>
          );
          }}
        />
      )}

      <InfoModal
        visible={!!withdrawalToValidate}
        onClose={() => setWithdrawalToValidate(null)}
        type="warning"
        title="Confirmer le retrait"
        message={withdrawalToValidate
          ? `En cliquant sur « Valider le retrait », vous confirmez avoir envoyé ${withdrawalToValidate.montant > 0 ? `${withdrawalToValidate.montant.toLocaleString('fr-FR')} FCFA` : 'le montant indiqué dans la transaction'} au ${withdrawalToValidate.numeroTelephone || 'numéro du client'}${withdrawalToValidate.operateur ? ` via ${withdrawalToValidate.operateur}` : ''}.`
          : undefined}
        confirmText="Valider le retrait"
        secondaryText="Retour"
        onSecondary={() => {}}
        onConfirm={() => {
          if (withdrawalToValidate) void confirmWithdrawalPaid(withdrawalToValidate);
        }}
      />

      <InfoModal
        visible={!!captureToValidate}
        onClose={() => setCaptureToValidate(null)}
        type="warning"
        title="Confirmer la validation manuelle"
        message={captureToValidate
          ? `Après vérification du paiement, confirmez avoir crédité manuellement le compte 1XBET ${captureToValidate.compteDestinataire ?? '—'} de ${captureToValidate.montant.toLocaleString('fr-FR')} FCFA.`
          : undefined}
        confirmText="Valider manuellement"
        secondaryText="Annuler"
        onSecondary={() => {}}
        onConfirm={() => {
          if (captureToValidate) void confirmCaptureReconciliation(captureToValidate);
        }}
      />

      <Modal
        visible={!!transactionToReject}
        transparent
        animationType="fade"
        onRequestClose={() => !rejectSubmitting && setTransactionToReject(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {transactionToReject?.statut === 'EN_RECLAMATION' ? 'Refuser la réclamation' : 'Refuser la transaction'}
            </Text>
            {!!transactionToReject && (
              <View style={styles.claimSummary}>
                <Text style={styles.claimSummaryText}>{transactionToReject.type === 'DEPOT' ? 'Dépôt' : 'Retrait'} · {transactionToReject.userName || 'Client'}</Text>
                <Text style={styles.claimSummaryText}>Statut actuel : {STATUS_LABEL[transactionToReject.statut]}</Text>
                <Text style={styles.claimSummaryText}>Montant : {transactionToReject.montant > 0 ? `${transactionToReject.montant.toLocaleString('fr-FR')} FCFA` : 'non renseigné'}</Text>
                {!!transactionToReject.referencePaiement && <Text style={styles.claimSummaryText}>Référence : {transactionToReject.referencePaiement}</Text>}
                {!!transactionToReject.creditError && <Text style={styles.claimSummaryText}>Détail Servcul : {transactionToReject.creditError}</Text>}
              </View>
            )}
            <Text style={styles.cardSubtitle}>
              {transactionToReject?.statut === 'EN_RECLAMATION'
                ? 'Confirmez-vous le refus définitif de cette réclamation ? Une transaction déjà validée ne peut pas être refusée.'
                : 'Confirmez-vous le refus définitif de cette transaction ? Une transaction déjà validée ne peut pas être refusée.'}
            </Text>
            <View style={styles.claimModalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                disabled={rejectSubmitting}
                onPress={() => setTransactionToReject(null)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectButton, rejectSubmitting && styles.disabled]}
                disabled={rejectSubmitting}
                onPress={() => void rejectTransaction()}
              >
                {rejectSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.rejectText}>Confirmer le refus</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const copyValue = () => {
    Clipboard.setString(value);
    Toast.show({ type: 'success', text1: 'Copié !', visibilityTime: 1200 });
  };

  return (
    <TouchableOpacity
      style={styles.detailRow}
      onPress={copyValue}
      activeOpacity={0.65}
      accessibilityRole="button"
      accessibilityLabel={`Copier ${label}`}
    >
      {label.includes('téléphone') && <Phone color="#38BDF8" size={15} />}
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
      <Copy color={Colors.textSecondary} size={14} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: Colors.secondaryBg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { padding: 4 },
  headerCopy: { flex: 1, gap: 2 },
  headerTitle: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  claimCount: { color: '#D8B4FE', fontSize: 10, fontWeight: '700' },
  captureReconciliationCount: { color: '#FBBF24', fontSize: 10, fontWeight: '700' },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 11 },
  capturePanel: { marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: Colors.cardBg, gap: 8 },
  captureBanner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  captureBannerActive: { backgroundColor: 'rgba(125,255,42,0.08)' },
  captureDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textSecondary },
  captureDotActive: { backgroundColor: Colors.primaryGreen },
  captureText: { color: Colors.textSecondary, fontSize: 12 },
  captureLastSeen: { color: Colors.textSecondary, fontSize: 10 },
  captureAction: { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B', paddingVertical: 7, paddingHorizontal: 10 },
  captureActionText: { color: '#FBBF24', fontSize: 11, fontWeight: '700' },
  filters: { gap: 8, paddingTop: 10 },
  searchInput: { marginHorizontal: 16, color: Colors.white, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  filterRow: { gap: 7, paddingHorizontal: 16 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 16, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: 'rgba(125,255,42,0.12)', borderColor: 'rgba(125,255,42,0.4)' },
  filterChipText: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600' },
  filterChipTextActive: { color: Colors.primaryGreen },
  captureReconciliationActions: { gap: 8, padding: 10, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 9 },
  captureReconciliationHint: { color: '#FCD34D', fontSize: 11, lineHeight: 16 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: Colors.cardBg, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, padding: 14, gap: 12 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardHeadingCopy: { flex: 1, gap: 3 },
  cardTitle: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  cardSubtitle: { color: Colors.textSecondary, fontSize: 11 },
  cardAmount: { color: Colors.primaryGreen, fontWeight: '900', fontSize: 13 },
  statusPanel: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 11 },
  detailsToggle: { minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(125,255,42,0.08)' },
  detailsToggleText: { color: Colors.primaryGreen, fontSize: 11, fontWeight: '700' },
  statusCopy: { flex: 1, gap: 3 },
  statusTitle: { fontSize: 13, fontWeight: '800' },
  details: { gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailCopy: { flex: 1, gap: 2 },
  detailLabel: { color: Colors.textSecondary, fontSize: 10 },
  detailValue: { color: Colors.white, fontSize: 12, lineHeight: 17 },
  resolveClaimButton: { alignItems: 'center', backgroundColor: 'rgba(192,132,252,0.14)', borderColor: 'rgba(192,132,252,0.45)', borderWidth: 1, borderRadius: 9, padding: 10 },
  rejectTransactionButton: { alignItems: 'center', borderColor: 'rgba(239,68,68,0.45)', borderWidth: 1, borderRadius: 9, padding: 10 },
  resolveClaimText: { color: '#D8B4FE', fontSize: 12, fontWeight: '800' },
  claimSummary: { backgroundColor: Colors.cardBg, borderRadius: 10, padding: 11, gap: 6, maxHeight: 260 },
  claimSummaryText: { color: Colors.white, fontSize: 12, lineHeight: 17 },
  claimModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, alignItems: 'center' },
  approveClaimButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryGreen, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10 },
  approveClaimText: { color: '#000', fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editStepButton: { justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.35)', borderWidth: 1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 },
  editStepText: { color: '#C4B5FD', fontWeight: '700', fontSize: 12 },
  validateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: Colors.primaryGreen, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  validateText: { color: '#000', fontWeight: '700', fontSize: 12 },
  rejectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  rejectText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  disabled: { opacity: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: Colors.secondaryBg, borderRadius: 16, padding: 18, gap: 14, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.white, fontWeight: '700', fontSize: 17 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 11, borderRadius: 9, backgroundColor: Colors.cardBg },
  statusOptionActive: { borderWidth: 1, borderColor: 'rgba(125,255,42,0.35)' },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusOptionText: { color: Colors.white, flex: 1, fontSize: 12, fontWeight: '600' },
  reasonInput: { minHeight: 100, color: Colors.white, backgroundColor: Colors.cardBg, borderRadius: 10, padding: 12, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  modalCancel: { justifyContent: 'center', paddingHorizontal: 12 },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600' },
});
