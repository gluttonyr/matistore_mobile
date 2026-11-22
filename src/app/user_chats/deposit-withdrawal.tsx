import { ChatInputBar } from '@/components/ChatinputBar';
import { PressableScale } from '@/components/ui/PressableScale';
import { ChatMessage } from '@/components/ChatMessage';
import { DateSeparator } from '@/components/dateSeparator';
import { HistoryLoader } from '@/components/historyLoader';
import { ImagePreviewModal } from '@/components/ImagePreviewModel';
import { ChatBackground } from '@/components/ChatBackground';
import { InfoModal } from '@/components/infomodal';

import GreenButton from '@/components/ui/GreenButton';
import {
  AmountHero, LiveBadge, PlayerFoundCard, RecapCard, StatusTimeline, StepDots, StepTransition,
  SuccessCheck, SummaryChips, flowStyles, formatClock, formatDuration, type SummaryChip, type TimelineStep,
} from '@/components/depositFlow';
import { DEPOSIT_DESIGN_V2 } from '@/constants/featureFlags';
import { Colors } from '@/constants/colors';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { DiscussionStatus } from '@/data_api/models/discussion.types';
import { MessageType } from '@/data_api/models/message.types';
import { Operateur } from '@/data_api/models/operateur.types';
import { Bookmaker, DEFAULT_BOOKMAKER } from '@/data_api/models/bookmaker.types';
import { bookmakerService } from '@/data_api/services/bookmakerService';
import { operateurService } from '@/data_api/services/operateurService';
import { transactionService } from '@/data_api/services/transactionService';
import { socketService } from '@/data_api/services/socketService';
import { useServculPlayerValidation } from '@/hooks/useServculPlayerValidation';
import { useAuth } from '@/hooks/useAuth';
import type { Transaction } from '@/data_api/models/transaction.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dialUssd } from '@/modules/expo-ussd-dialer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useChat } from '@/hooks/useChat';
import { useChatSections } from '@/hooks/useChatSection';

import { useDiscussionPresence } from '@/hooks/useDiscussionPresence';
import { resolveFileUrl, useFileUrl } from '@/hooks/useFileUrl';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  History,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Copy,
  ExternalLink,
  Info,
  WifiOff,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useWideWeb } from '@/hooks/useWideWeb';
import { webSidebarStyles } from '@/components/webSidebarStyles';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CountryPicker, {
  Country,
  CountryCode,
  DARK_THEME,
} from '@/components/CountryPicker';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode as PhoneCountryCode } from 'libphonenumber-js';

type Mode = 'chat' | 'deposit' | 'withdrawal';
// 0 = choice of the bookmaker, before the operator.
type DepositStep = 0 | 1 | 2 | 3 | 4 | 5;
// 4 = live tracking after the request (new design only).
type WithdrawalStep = 0 | 1 | 2 | 3 | 4;

/** New design: steps slide in. Old design: rendered as is. */
const StepWrap = ({ stepKey, children }: { stepKey: string | number; children: ReactNode }) =>
  DEPOSIT_DESIGN_V2 ? <StepTransition stepKey={stepKey}>{children}</StepTransition> : <>{children}</>;
const LAST_SEEN_TRANSACTIONS_KEY = 'transactions_last_seen_at';
const LAST_USED_TRANSACTION_INPUTS_KEY = 'transaction_last_inputs:';

type SavedPhoneInput = {
  phoneNumber?: string;
  callingCode?: string;
  countryCode?: string;
};

type LastUsedTransactionInputs = {
  /** Last ID used before the bookmaker choice: a 1XBET one. */
  accountId?: string;
  /** Last ID used per bookmaker code: a 1XBET ID means nothing on MELBET. */
  accountIdByBookmaker?: Record<string, string>;
  phoneByOperator?: Record<string, SavedPhoneInput>;
  phoneNumber?: string;
  callingCode?: string;
  countryCode?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getDepositCreationError = (error: unknown) => {
  const response = isRecord(error) && isRecord(error.response) ? error.response : null;
  if (response?.status === 503) {
    return {
      title: 'Dépôts temporairement indisponibles',
      message: 'Le service de vérification des paiements est temporairement indisponible. Vous ne pouvez pas créer de dépôt pour le moment. Réessayez un peu plus tard.',
    };
  }
  if (response?.status === 409) {
    const responseData = isRecord(response.data) ? response.data : null;
    const serverMessage = typeof responseData?.message === 'string' ? responseData.message : '';
    const verified = serverMessage.includes('déjà vérifié');
    return {
      title: verified ? 'Dépôt en cours de validation' : 'Dépôt déjà en cours',
      message: verified
        ? 'Votre paiement a bien été reçu. Nous finalisons le crédit de votre compte ; vous pourrez faire un autre dépôt après le traitement de celui-ci.'
        : 'Un dépôt précédent est encore en attente de vérification. Pour éviter un paiement en double, attendez sa mise à jour avant d’en créer un autre.',
    };
  }
  return {
    title: 'Création du dépôt impossible',
    message: getApiErrorMessage(error)
      .replace(/Servcul/gi, 'notre service de paiement')
      .replace(/l’administrateur|administrateur/gi, 'notre équipe')
      .replace(/MatiStore/gi, 'nous'),
  };
};

// Formate un montant saisi/choisi en groupant les milliers par un espace (ex: "5000" → "5 000").
const formatAmountInput = (raw: string): string => {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Récupère la valeur numérique réelle d'un montant formaté (ignore les espaces).
const parseAmount = (formatted: string): number => {
  const digits = formatted.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : NaN;
};

const isPhoneValidForCountry = (value: string, countryCode: CountryCode) => {
  const phone = value.trim();
  if (!phone) return false;
  try {
    return isValidPhoneNumber(phone, countryCode as PhoneCountryCode);
  } catch {
    return false;
  }
};

const formatPhoneForCountry = (value: string, countryCode: CountryCode) => {
  try {
    const parsed = parsePhoneNumberFromString(value, countryCode as PhoneCountryCode);
    return parsed?.isValid() ? parsed.formatNational() : value;
  } catch {
    return value;
  }
};

// ── Composant image opérateur ────────────────────────────────────────────────
function OperatorImage({
  imageUrl,
  style,
}: {
  imageUrl?: string | null;
  style?: object;
}) {
  const uri = useFileUrl('operateurs', imageUrl);
  if (!uri) return <View style={[style, { backgroundColor: Colors.border }]} />;
  return <Image source={{ uri }} style={style} resizeMode="contain" />;
}

// Operator choice: each logo in a big white circle (the logos have a white background),
// the name under it; the chosen one gets a green ring and a check.
function OperatorCircles({ operators, selectedId, onSelect }: {
  operators: { trackingId: string; nom: string; imageUrl?: string | null }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={st.circleRow}>
      {operators.map((op) => {
        const on = selectedId === op.trackingId;
        return (
          <TouchableOpacity
            key={op.trackingId}
            style={st.circleItem}
            onPress={() => onSelect(op.trackingId)}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={op.nom}
          >
            <View style={[st.circleRing, on && st.circleRingOn]}>
              <View style={st.circleLogo}><OperatorImage imageUrl={op.imageUrl} style={st.operatorImage} /></View>
              {on && <View style={st.circleCheck}><Check color="#050505" size={13} strokeWidth={3.2} /></View>}
            </View>
            <Text style={[st.circleName, on && { color: Colors.primaryGreen }]}>{op.nom}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Logo bookmaker (bannière 2:1 fournie par le serveur) ─────────────────────
function BookmakerImage({ imageUrl, style }: { imageUrl?: string | null; style?: object }) {
  const uri = useFileUrl('bookmakers', imageUrl);
  if (!uri) return <View style={[style, { backgroundColor: Colors.border }]} />;
  return <Image source={{ uri }} style={style} resizeMode="cover" />;
}

export default function DepositWithdrawalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { initialMode } = useLocalSearchParams<{ initialMode?: string }>();
  const { transactionId: incomingTransactionId } = useLocalSearchParams<{ transactionId?: string }>();
  // Quick deposit from the home card: replays the last deposit with a new amount.
  const quick = useLocalSearchParams<{
    quickOperator?: string;
    quickBookmaker?: string;
    quickPhone?: string;
    quickAccount?: string;
    quickAmount?: string;
  }>();
  const { user } = useAuth();

  const {
    messages,
    loading,
    sending,
    sendText,
    sendFile,
    sendSticker,
    currentUserId,
    deleteMessage,
    loadMoreHistory,
    loadingMore,
    hasMoreHistory,
  } = useChat(id);

  const [mode, setMode] = useState<Mode>('chat');
  const [depositStep, setDepositStep] = useState<DepositStep>(0);
  const [withdrawalStep, setWithdrawalStep] = useState<WithdrawalStep>(0);
  const [lastUsedInputs, setLastUsedInputs] = useState<LastUsedTransactionInputs | null>(null);

  useEffect(() => {
    if (!user?.trackingId) {
      setLastUsedInputs(null);
      return;
    }
    setLastUsedInputs(null);
    let active = true;
    AsyncStorage.getItem(`${LAST_USED_TRANSACTION_INPUTS_KEY}${user.trackingId}`)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw) as LastUsedTransactionInputs;
        setLastUsedInputs(parsed);
      })
      .catch(() => {
        if (active) setLastUsedInputs(null);
      });
    return () => { active = false; };
  }, [user?.trackingId]);

  const rememberTransactionInputs = useCallback(async (
    inputs: LastUsedTransactionInputs,
    selectedOperatorId: string,
    selectedBookmakerCode: string,
  ) => {
    if (!user?.trackingId) return;
    const accountIdByBookmaker = { ...(lastUsedInputs?.accountIdByBookmaker ?? {}) };
    if (selectedBookmakerCode && inputs.accountId?.trim()) {
      accountIdByBookmaker[selectedBookmakerCode] = inputs.accountId.trim();
    }
    const phoneByOperator = { ...(lastUsedInputs?.phoneByOperator ?? {}) };
    if (selectedOperatorId && inputs.phoneNumber?.trim()) {
      phoneByOperator[selectedOperatorId] = {
        phoneNumber: inputs.phoneNumber.trim(),
        callingCode: inputs.callingCode,
        countryCode: inputs.countryCode,
      };
    }
    const saved = {
      ...lastUsedInputs,
      ...inputs,
      phoneByOperator,
      accountIdByBookmaker,
      accountId: inputs.accountId?.trim(),
      phoneNumber: inputs.phoneNumber?.trim(),
    };
    setLastUsedInputs(saved);
    try {
      await AsyncStorage.setItem(`${LAST_USED_TRANSACTION_INPUTS_KEY}${user.trackingId}`, JSON.stringify(saved));
    } catch {
      // Le stockage du dernier numéro ne doit jamais bloquer une transaction confirmée.
    }
  }, [lastUsedInputs, user?.trackingId]);

  const adminPresent = useDiscussionPresence(id);
  // ── Opérateurs depuis l'API ──────────────────────────────────────────────
  const [operators, setOperators] = useState<Operateur[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  const loadOperators = useCallback(() => {
    setLoadingOperators(true);
    operateurService
      .getAll()
      .then((items) => {
        setOperators(items);
        const imageUrls = items
          .map((operator) => resolveFileUrl('operateurs', operator.imageUrl))
          .filter(Boolean);
        imageUrls.forEach((url) => { void Image.prefetch(url).catch(() => false); });
      })
      .catch(() => setOperators([]))
      .finally(() => setLoadingOperators(false));
  }, []);

  useEffect(() => {
    loadOperators();
  }, [loadOperators]);

  // ── Bookmakers depuis l'API (nom, logo, liens, actif) ─────────────────
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [loadingBookmakers, setLoadingBookmakers] = useState(false);
  const [bookmakerCode, setBookmakerCode] = useState('');

  const loadBookmakers = useCallback(() => {
    setLoadingBookmakers(true);
    bookmakerService
      .getAll()
      .then((items) => {
        setBookmakers(items);
        items
          .map((bookmaker) => resolveFileUrl('bookmakers', bookmaker.imageUrl))
          .filter(Boolean)
          .forEach((url) => { void Image.prefetch(url).catch(() => false); });
      })
      .catch(() => setBookmakers([]))
      .finally(() => setLoadingBookmakers(false));
  }, []);

  useEffect(() => {
    loadBookmakers();
  }, [loadBookmakers]);

  const [operatorId, setOperatorId] = useState('');
  const selectOperator = useCallback((nextOperatorId: string) => {
    if (nextOperatorId === operatorId) return;
    setOperatorId(nextOperatorId);
    if (mode === 'deposit') {
      setPhoneNumber('');
      setCallingCode('228');
      setCountryCode('TG');
    } else if (mode === 'withdrawal') {
      setWPhoneNumber('');
      setWCallingCode('228');
      setWCountryCode('TG');
    }
  }, [mode, operatorId]);
  const [amount, setAmount] = useState('');

  // ── Dépôt — téléphone avec sélecteur de pays ────────────────────────────
  const [countryCode, setCountryCode] = useState<CountryCode>('TG');
  const [callingCode, setCallingCode] = useState('228');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showDepositPicker, setShowDepositPicker] = useState(false);
  const phone = `+${callingCode}${phoneNumber.replace(/\D/g, '')}`;
  const depositPhoneValid = isPhoneValidForCountry(phoneNumber, countryCode);

  // ── Dépôt — ID de compte ─────────────────────────────────────────────────
  const [accountId, setAccountId] = useState('');
  const selectedBookmaker = bookmakers.find((bookmaker) => bookmaker.code === bookmakerCode);
  // Name used in texts; a transaction reopened from a notification keeps its own bookmaker.
  const bookmakerName = selectedBookmaker?.nom || bookmakerCode || DEFAULT_BOOKMAKER;
  const lastAccountId = bookmakerCode
    ? lastUsedInputs?.accountIdByBookmaker?.[bookmakerCode]
      ?? (bookmakerCode === DEFAULT_BOOKMAKER ? lastUsedInputs?.accountId : undefined)
    : undefined;
  const depositPlayerValidation = useServculPlayerValidation(accountId, bookmakerCode, bookmakerName);

  // ── Retrait — téléphone avec sélecteur de pays ───────────────────────────
  const [wCountryCode, setWCountryCode] = useState<CountryCode>('TG');
  const [wCallingCode, setWCallingCode] = useState('228');
  const [wPhoneNumber, setWPhoneNumber] = useState('');
  const [showWithdrawalPicker, setShowWithdrawalPicker] = useState(false);
  const withdrawalPhone = `+${wCallingCode}${wPhoneNumber.replace(/\D/g, '')}`;
  const withdrawalPhoneValid = isPhoneValidForCountry(wPhoneNumber, wCountryCode);
  const [withdrawalAccountId, setWithdrawalAccountId] = useState('');
  const withdrawalPlayerValidation = useServculPlayerValidation(withdrawalAccountId, bookmakerCode, bookmakerName);

  const selectBookmaker = useCallback((bookmaker: Bookmaker) => {
    if (!bookmaker.active) {
      Toast.show({ type: 'info', text1: `${bookmaker.nom} arrive bientôt`, text2: 'Ce bookmaker n’est pas encore disponible.' });
      return;
    }
    if (bookmaker.code === bookmakerCode) return;
    setBookmakerCode(bookmaker.code);
    // An account ID belongs to one bookmaker.
    setAccountId('');
    setWithdrawalAccountId('');
  }, [bookmakerCode]);

  // Restore only the phone saved for the currently selected operator.
  useEffect(() => {
    if (!operatorId) return;
    const saved = lastUsedInputs?.phoneByOperator?.[operatorId];
    if (!saved?.phoneNumber) return;
    if (mode === 'deposit' && !phoneNumber.trim()) {
      setPhoneNumber(saved.phoneNumber);
      setCallingCode(saved.callingCode || '228');
      if (saved.countryCode) setCountryCode(saved.countryCode as CountryCode);
    } else if (mode === 'withdrawal' && !wPhoneNumber.trim()) {
      setWPhoneNumber(saved.phoneNumber);
      setWCallingCode(saved.callingCode || '228');
      if (saved.countryCode) setWCountryCode(saved.countryCode as CountryCode);
    }
  }, [lastUsedInputs, mode, operatorId]);

  const [withdrawalCode, setWithdrawalCode] = useState('');

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cancellingDeposit, setCancellingDeposit] = useState(false);
  const [manualDialOpened, setManualDialOpened] = useState(false);
  // New design: the validated deposit, shown on the success screen.
  const [depositSucceeded, setDepositSucceeded] = useState<Transaction | null>(null);
  const [paymentCodeCopied, setPaymentCodeCopied] = useState(false);
  const [showCancelDepositSheet, setShowCancelDepositSheet] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollBusyRef = useRef(false);
  const cancelInProgressRef = useRef(false);
  const creditErrorShownRef = useRef<string | null>(null);
  const successNoticeShownRef = useRef<string | null>(null);
  const [text, setText] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [hasUnseenTransaction, setHasUnseenTransaction] = useState(false);
  const [depositCaptureAvailable, setDepositCaptureAvailable] = useState(false);
  const [captureStatusChecked, setCaptureStatusChecked] = useState(false);
  const listRef = useRef<SectionList>(null);
  const audio = useAudioRecorder();

  // Messages groupés par jour pour les séparateurs de date flottants.
  const sections = useChatSections(messages);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      if (!sections.length) return;
      const lastSectionIndex = sections.length - 1;
      const lastItemIndex = sections[lastSectionIndex].data.length - 1;
      try {
        listRef.current?.scrollToLocation({
          sectionIndex: lastSectionIndex,
          itemIndex: lastItemIndex,
          animated,
          viewPosition: 1,
        });
      } catch { }
    }, 120);
  }, [sections]);

  const lastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    const lastId = messages[messages.length - 1].trackingId;
    if (lastId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastId;
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (initialMode === 'deposit') setMode('deposit');
    else if (initialMode === 'withdrawal') setMode('withdrawal');
  }, [initialMode]);

  useEffect(() => {
    if (!incomingTransactionId) return;
    transactionService.getById(incomingTransactionId)
      .then((loadedTransaction) => {
        setTransaction(loadedTransaction);
        setBookmakerCode(loadedTransaction.bookmaker || DEFAULT_BOOKMAKER);
        setMode('deposit');
        setDepositStep(5);
        setProcessing(
          loadedTransaction.statut === 'EN_ATTENTE_AUTO'
          || loadedTransaction.statut === 'EN_VERIFICATION',
        );
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger cette transaction.'));
  }, [incomingTransactionId]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const refreshCaptureStatus = () => transactionService.getCaptureStatus()
      .then((status) => { if (!cancelled) setDepositCaptureAvailable(status.available); })
      .catch(() => { if (!cancelled) setDepositCaptureAvailable(false); })
      .finally(() => { if (!cancelled) setCaptureStatusChecked(true); });
    void refreshCaptureStatus();
    const captureTimer = setInterval(refreshCaptureStatus, 20_000);
    (async () => {
      try {
        const lastSeen = await AsyncStorage.getItem(LAST_SEEN_TRANSACTIONS_KEY);
        if (cancelled) return;
        const lastSeenAt = lastSeen ? new Date(lastSeen).getTime() : 0;
        const result = await transactionService.getUpdatedSince(new Date(lastSeenAt).toISOString());
        if (cancelled) return;
        setHasUnseenTransaction(result.hasUpdates);
      } catch {
        // Le badge ne bloque pas l'ouverture de la discussion.
      }
    })();
    return () => { cancelled = true; clearInterval(captureTimer); };
  }, []));

  const currentOperator = operators.find((o) => o.trackingId === operatorId);
  const depositProgressStep = depositStep === 0 ? 1 : depositStep === 1 ? 2 : depositStep === 4 ? 3 : depositStep === 5 ? 5 : 4;
  const depositProgressLabels = ['Bookmaker', 'Opérateur', 'Compte', 'Paiement', 'Code'];
  const paymentProgressStep = transaction?.creditError
    ? 2
    : transaction?.statut === 'VALIDEE'
      ? 4
      : transaction?.statut === 'EN_ATTENTE_ADMIN'
        || (transaction?.statut === 'EN_VERIFICATION' && !!transaction.referencePaiement)
        ? 3
        : 1;
  const paymentProgressLabels = ['Paiement', 'Paiement reçu', 'Crédit en cours', 'Compte crédité'];
  // Le montant affiché contient des espaces (séparateurs de milliers) : le code USSD
  // composé, lui, ne doit contenir que des chiffres.
  const rawAmount = amount.replace(/[^0-9]/g, '');
  const depositPaymentAlreadyReceived = !!(transaction?.referencePaiement || transaction?.creditError);

  // Le numéro saisi par l'utilisateur (indicatif + numéro, sans le "+") : selon
  // l'opérateur, {numero} peut apparaître 0, 1 ou plusieurs fois dans le
  // format — ou pas du tout (ex: TMoney n'en a pas besoin).
  const depositNumero = `${callingCode}${phoneNumber.replace(/\D/g, '')}`;

  const buildUssdCode = (op: Operateur, numero: string, montant: string) =>
    op.formatUssd
      .replace(/\{numero\}/g, numero)
      .replace(/\{montant\}/g, montant);

  // ── Handlers chat ────────────────────────────────────────────────────────
  const handleSendText = () => {
    if (!text.trim()) return;
    sendText(text.trim());
    setText('');
    scrollToBottom();
  };

  const handleSendFile = async (
    file: { uri: string; name: string; type: string },
    type: MessageType,
  ) => {
    await sendFile(file, type);
  };

  const handleSendSticker = (stickerImage: string) => {
    sendSticker(stickerImage);
  };

  // ── Soumission dépôt ─────────────────────────────────────────────────────
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [withdrawalNotice, setWithdrawalNotice] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const createDepositTransaction = useCallback(async () => {
    if (!depositPhoneValid) {
      throw new Error('Vérifiez le format du numéro pour le pays sélectionné.');
    }
    if (depositPlayerValidation.player?.userId !== Number(accountId.trim())) {
      throw new Error(`Vérifiez votre compte ${bookmakerName} avant de continuer.`);
    }
    if (transaction) return transaction;
    if (!currentOperator) throw new Error('Opérateur introuvable');
    setCreatingTransaction(true);
    try {
      const created = await transactionService.create({
        type: 'DEPOT',
        montant: parseAmount(amount),
        operateur: currentOperator.nom,
        bookmaker: bookmakerCode,
        numeroTelephone: phone,
        compteDestinataire: accountId.trim(),
      });
      void rememberTransactionInputs({
        accountId: accountId.trim(),
        phoneNumber,
        callingCode,
        countryCode,
      }, currentOperator.trackingId, bookmakerCode);
      setTransaction(created);
      return created;
    } finally {
      setCreatingTransaction(false);
    }
  }, [accountId, amount, bookmakerCode, bookmakerName, callingCode, countryCode, currentOperator, depositPhoneValid, depositPlayerValidation.player, phone, rememberTransactionInputs, transaction]);

  const prepareDeposit = async () => {
    if (!depositCaptureAvailable) {
      Alert.alert('Dépôts temporairement indisponibles', 'Le service de vérification des paiements est temporairement indisponible. Réessayez un peu plus tard.');
      return;
    }
    if (depositPlayerValidation.player?.userId !== Number(accountId.trim())) {
      Alert.alert(`ID ${bookmakerName} non vérifié`, `Vérifiez votre compte ${bookmakerName} avant de continuer.`);
      return;
    }
    setDepositStep(2);
  };

  const createDepositAndContinue = async () => {
    if (!depositCaptureAvailable) {
      Alert.alert('Dépôts temporairement indisponibles', 'Le service de vérification des paiements est temporairement indisponible. Réessayez un peu plus tard.');
      return;
    }
    if (!currentOperator || creatingTransaction || !depositPhoneValid) return;
    const parsedAmount = parseAmount(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 300) {
      Alert.alert('Montant invalide', 'Saisissez un montant valide pour continuer.');
      return;
    }
    try {
      await createDepositTransaction();
      setDepositStep(5);
    } catch (error) {
      const depositError = getDepositCreationError(error);
      Toast.show({
        type: 'error',
        text1: depositError.title,
        text2: depositError.message,
      });
    }
  };

  const beginDeposit = async () => {
    if (!depositCaptureAvailable) {
      Alert.alert('Dépôts temporairement indisponibles', 'Le service de vérification des paiements est temporairement indisponible. Réessayez un peu plus tard.');
      return;
    }
    if (!currentOperator || creatingTransaction || depositPaymentAlreadyReceived) return;
    if (!depositPhoneValid) {
      Toast.show({ type: 'error', text1: 'Numéro invalide', text2: 'Vérifiez le format du numéro pour le pays sélectionné.' });
      return;
    }
    const parsedAmount = parseAmount(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 300) {
      Alert.alert('Montant invalide', 'Saisissez un montant valide pour continuer.');
      return;
    }
    const code = buildUssdCode(currentOperator, depositNumero, rawAmount);
    setProcessing(true);

    const resetAfterUssdFailure = (error?: unknown) => {
      setProcessing(false);
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';
      const ussdFailure = errorMessage.match(
        /USSD request failed \(code (-?\d+), voice subscription \d+\)/i,
      );
      const userErrorMessage = ussdFailure
        ? `La demande USSD a échoué sur le réseau mobile (code ${ussdFailure[1]}). La SIM vocale a bien été sélectionnée. Vérifiez le code et la couverture réseau, puis réessayez.`
        : errorMessage || 'Vérifiez votre réseau et votre carte SIM, puis réessayez.';
      Toast.show({
        type: 'error',
        text1: 'Code USSD non exécuté',
        text2: userErrorMessage,
      });
    };

    try {
      await createDepositTransaction();
    } catch (error) {
      setProcessing(false);
      const depositError = getDepositCreationError(error);
      Toast.show({
        type: 'error',
        text1: depositError.title,
        text2: depositError.message,
      });
      return;
    }

    // The code is always in the clipboard: the client can paste it in Phone if anything goes wrong.
    Clipboard.setString(code);

    const dialerOpened = () => {
      setManualDialOpened(true);
      if (Platform.OS === 'android') {
        Toast.show({ type: 'info', text1: 'Code prêt dans votre téléphone', text2: 'Appuyez sur Appeler pour payer. Nous vérifions ensuite votre paiement.' });
      }
    };

    // Phone app with the code filled in: works on every phone, the client only taps Call.
    const openDialer = async () => {
      await Linking.openURL(`tel:${encodeURIComponent(code)}`);
      dialerOpened();
    };

    try {
      if (Platform.OS !== 'android') {
        await openDialer();
        return;
      }
      // Never asks for a permission: launches the code when it is already granted, else opens the dialer.
      const result = await dialUssd(code);
      if (result === 'DIALER') dialerOpened();
    } catch (error) {
      const nativeCode = (error as { code?: string } | null)?.code ?? '';
      if (nativeCode === 'USSD_CANCELLED') {
        // The client closed the SIM choice: nothing launched, he can tap the button again.
        setManualDialOpened(true);
        return;
      }
      try {
        await openDialer();
      } catch (dialError) {
        resetAfterUssdFailure(dialError);
      }
    }
  };

  const copyDepositCode = async () => {
    if (!depositCaptureAvailable) {
      Alert.alert('Dépôts temporairement indisponibles', 'Le service de vérification des paiements est temporairement indisponible. Réessayez un peu plus tard.');
      return;
    }
    if (!currentOperator || creatingTransaction || depositPaymentAlreadyReceived) return;
    if (!depositPhoneValid) {
      Toast.show({ type: 'error', text1: 'Numéro invalide', text2: 'Vérifiez le format du numéro pour le pays sélectionné.' });
      return;
    }
    const parsedAmount = parseAmount(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 300) {
      Alert.alert('Montant invalide', 'Saisissez un montant valide pour continuer.');
      return;
    }

    setProcessing(true);
    try {
      await createDepositTransaction();
      Clipboard.setString(buildUssdCode(currentOperator, depositNumero, rawAmount));
      setPaymentCodeCopied(true);
      Toast.show({
        type: 'success',
        text1: 'Code copié',
        text2: 'Composez-le sur le téléphone utilisant le numéro indiqué. Nous vérifierons la réception de votre paiement.',
      });
    } catch (error) {
      setProcessing(false);
      const depositError = getDepositCreationError(error);
      Toast.show({
        type: 'error',
        text1: depositError.title,
        text2: depositError.message,
      });
    }
  };

  // ── Dépôt rapide : préremplit tout, vérifie l'ID, puis lance le paiement ──
  const quickAppliedRef = useRef(false);
  const [quickPending, setQuickPending] = useState(false);

  useEffect(() => {
    if (quickAppliedRef.current || !quick.quickOperator || incomingTransactionId) return;
    if (!operators.length || !bookmakers.length) return;
    quickAppliedRef.current = true;
    const op = operators.find((o) => o.nom === quick.quickOperator);
    const bk = bookmakers.find((b) => b.code === (quick.quickBookmaker || DEFAULT_BOOKMAKER));
    if (!op || !bk?.active) {
      Toast.show({ type: 'info', text1: 'Dépôt rapide indisponible', text2: 'Refaites un dépôt complet.' });
      return;
    }
    const parsed = parsePhoneNumberFromString(quick.quickPhone ?? '');
    setMode('deposit');
    setBookmakerCode(bk.code);
    setOperatorId(op.trackingId);
    if (parsed?.country) {
      setCountryCode(parsed.country as CountryCode);
      setCallingCode(parsed.countryCallingCode);
      setPhoneNumber(parsed.formatNational());
    }
    setAccountId(quick.quickAccount ?? '');
    setAmount(formatAmountInput(quick.quickAmount ?? ''));
    // The account step shows the ID check; on any problem the client continues from there.
    setDepositStep(4);
    setQuickPending(true);
  }, [bookmakers, incomingTransactionId, operators, quick.quickAccount, quick.quickAmount, quick.quickBookmaker, quick.quickOperator, quick.quickPhone]);

  useEffect(() => {
    if (!quickPending || depositPlayerValidation.checking || !captureStatusChecked) return;
    if (depositPlayerValidation.error) { setQuickPending(false); return; }
    if (depositPlayerValidation.player?.userId !== Number(accountId.trim())) return;
    setQuickPending(false);
    if (!currentOperator || !depositPhoneValid || parseAmount(amount) < 300) return;
    if (!depositCaptureAvailable) {
      Alert.alert('Dépôts temporairement indisponibles', 'Le service de vérification des paiements est temporairement indisponible. Réessayez un peu plus tard.');
      return;
    }
    setDepositStep(5);
    // A browser can't dial: there the client copies the code from the payment step.
    if (Platform.OS !== 'web') void beginDeposit();
  }, [quickPending, depositPlayerValidation.checking, depositPlayerValidation.error, depositPlayerValidation.player, captureStatusChecked]);

  const stopTransactionPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Soumission retrait ───────────────────────────────────────────────────
  const handleWithdrawalSubmit = async () => {
    if (withdrawalSubmitting) return;
    if (!currentOperator) {
      Alert.alert('Opérateur requis', 'Choisissez l’opérateur Mobile Money du numéro destinataire.');
      setWithdrawalStep(1);
      return;
    }
    if (!withdrawalPhoneValid) {
      setWithdrawalNotice({
        type: 'error',
        title: 'Numéro invalide',
        message: 'Vérifiez le format du numéro pour le pays sélectionné.',
      });
      return;
    }
    if (withdrawalPlayerValidation.player?.userId !== Number(withdrawalAccountId.trim())) {
      Alert.alert(`ID ${bookmakerName} non vérifié`, `Vérifiez votre compte ${bookmakerName} avant de continuer.`);
      return;
    }
    setWithdrawalSubmitting(true);
    try {
      const created = await transactionService.create({
        type: 'RETRAIT',
        operateur: currentOperator.nom,
        bookmaker: bookmakerCode,
        compteDestinataire: withdrawalAccountId.trim(),
        numeroTelephone: withdrawalPhone,
        codeRetrait: withdrawalCode.trim(),
      });
      void rememberTransactionInputs({
        accountId: withdrawalAccountId.trim(),
        phoneNumber: wPhoneNumber,
        callingCode: wCallingCode,
        countryCode: wCountryCode,
      }, currentOperator.trackingId, bookmakerCode);
      setTransaction(created);
      try {
        await sendText(
        `📤 *Demande de retrait*\n` +
        `Code ${bookmakerName} : ${withdrawalCode}\n` +
        `Numéro: ${withdrawalPhone}`,
          DiscussionStatus.RETRAIT
        );
      } catch {
        // Transaction créée côté serveur; l'échec du message chat ne doit pas annuler la demande.
      }
      if (DEPOSIT_DESIGN_V2 && created.statut === 'EN_ATTENTE_ADMIN') {
        // New design: live tracking instead of the popup.
        setWithdrawalStep(4);
        return;
      }
      setWithdrawalNotice(created.statut === 'EN_ATTENTE_ADMIN'
        ? {
          type: 'success',
          title: `Débit ${bookmakerName} confirmé`,
          message: `Votre compte ${bookmakerName} a été débité${created.montant > 0 ? ` de ${created.montant.toLocaleString('fr-FR')} FCFA` : ''}. Patientez pendant la préparation de l’envoi au numéro indiqué.`,
        }
        : {
          type: 'error',
          title: created.creditError?.toLocaleLowerCase().includes('code de retrait invalide') ? 'Code de retrait invalide' : 'Retrait à vérifier',
          message: created.creditError
          || 'Le code de retrait n’a pas pu être validé pour le moment. Veuillez revérifier le code et réessayer. Si le problème persiste, contactez notre support.',
        });
    } catch {
      setWithdrawalNotice({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d’enregistrer la demande de retrait. Réessayez.',
      });
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  const resetForm = useCallback(() => {
    stopTransactionPolling();
    setMode('chat');
    setDepositStep(0);
    setProcessing(false);
    setManualDialOpened(false);
    setPaymentCodeCopied(false);
    setWithdrawalStep(0);
    setBookmakerCode('');
    setOperatorId('');
    setAmount('');
    // Dépôt téléphone
    setPhoneNumber('');
    setCallingCode('228');
    setCountryCode('TG');
    // Dépôt ID de compte
    setAccountId('');
    setWithdrawalAccountId('');
    // Retrait téléphone
    setWPhoneNumber('');
    setWCallingCode('228');
    setWCountryCode('TG');
    // Retrait code
    setWithdrawalCode('');
    setTransaction(null);
    setDepositSucceeded(null);
  }, [stopTransactionPolling]);

  const cancelDeposit = async () => {
    if (!transaction || cancellingDeposit) return;
    cancelInProgressRef.current = true;
    setCancellingDeposit(true);
    try {
      await transactionService.cancel(transaction.trackingId);
      stopTransactionPolling();
      resetForm();
      Toast.show({
        type: 'success',
        text1: 'Dépôt annulé',
        text2: 'Votre demande de dépôt a été annulée.',
      });
    } catch (error) {
      try {
        const latest = await transactionService.getById(transaction.trackingId);
        setTransaction(latest);
      } catch {
        // Preserve the cancellation error if refreshing the transaction also fails.
      }
      Toast.show({
        type: 'error',
        text1: 'Annulation impossible',
        text2: getApiErrorMessage(error),
      });
    } finally {
      cancelInProgressRef.current = false;
      setCancellingDeposit(false);
    }
  };

  const pollingTransactionId = transaction?.trackingId;
  useEffect(() => {
    if (!pollingTransactionId || mode !== 'deposit') return;
    const socket = socketService.getSocket();
    if (!socket) return;
    const handleTransactionStatusChanged = (event: { transactionId?: string; trackingId?: string }) => {
      if ((event.transactionId ?? event.trackingId) !== pollingTransactionId || pollBusyRef.current) return;
      pollBusyRef.current = true;
      transactionService.getById(pollingTransactionId)
        .then((updated) => {
          if (cancelInProgressRef.current) return;
          setTransaction(updated);
          if (updated.statut === 'VALIDEE') {
            stopTransactionPolling();
            if (successNoticeShownRef.current !== updated.trackingId) {
              successNoticeShownRef.current = updated.trackingId;
              if (DEPOSIT_DESIGN_V2) setDepositSucceeded(updated);
              else setWithdrawalNotice({
                type: 'success',
                title: 'Dépôt crédité',
                message: `Votre dépôt de ${updated.montant} FCFA a été crédité sur votre compte ${updated.bookmaker || bookmakerName}.\nNuméro : ${updated.numeroTelephone || '—'}${updated.referencePaiement ? `\nRéférence : ${updated.referencePaiement}` : ''}`,
              });
            }
          } else if (updated.creditError) {
            const errorKey = `${updated.trackingId}:${updated.creditError}`;
            if (creditErrorShownRef.current !== errorKey) {
              creditErrorShownRef.current = errorKey;
              setWithdrawalNotice({ type: 'error', title: 'Crédit non confirmé', message: updated.creditError });
            }
          } else if (updated.statut === 'REJETEE' || updated.statut === 'ANNULEE') {
            stopTransactionPolling();
            resetForm();
            if (updated.statut === 'REJETEE' && updated.motifRejet?.includes('trois minutes')) {
              Toast.show({
                type: 'error',
                text1: 'Délai dépassé',
                text2: 'Votre dépôt a été refusé car le paiement n’a pas été détecté dans les trois minutes. Vous pouvez recommencer depuis le chat.',
              });
            } else {
              router.push('/user_transactions');
            }
          }
        })
        .catch(() => {
          // Keep the existing interval poll as a fallback if the socket refresh fails.
        })
        .finally(() => {
          pollBusyRef.current = false;
        });
    };
    socket.on('transactionStatusChanged', handleTransactionStatusChanged);
    return () => {
      socket.off('transactionStatusChanged', handleTransactionStatusChanged);
    };
  }, [mode, pollingTransactionId, resetForm, stopTransactionPolling]);

  useEffect(() => {
    if (!pollingTransactionId || mode !== 'deposit') return;

    pollRef.current = setInterval(async () => {
      if (pollBusyRef.current) return;
      pollBusyRef.current = true;
      try {
        const updated = await transactionService.getById(pollingTransactionId);
        if (cancelInProgressRef.current) return;
        setTransaction(updated);
        if (updated.statut === 'VALIDEE') {
          stopTransactionPolling();
          if (successNoticeShownRef.current !== updated.trackingId) {
            successNoticeShownRef.current = updated.trackingId;
            if (DEPOSIT_DESIGN_V2) setDepositSucceeded(updated);
            else setWithdrawalNotice({
              type: 'success',
              title: 'Dépôt crédité',
              message: `Votre dépôt de ${updated.montant} FCFA a été crédité sur votre compte ${updated.bookmaker || bookmakerName}.\nNuméro : ${updated.numeroTelephone || '—'}${updated.referencePaiement ? `\nRéférence : ${updated.referencePaiement}` : ''}`,
            });
          }
        } else if (updated.creditError) {
          const errorKey = `${updated.trackingId}:${updated.creditError}`;
          if (creditErrorShownRef.current !== errorKey) {
            creditErrorShownRef.current = errorKey;
            setWithdrawalNotice({ type: 'error', title: 'Crédit non confirmé', message: updated.creditError });
          }
        } else if (updated.statut === 'REJETEE' || updated.statut === 'ANNULEE') {
          stopTransactionPolling();
          resetForm();
          if (updated.statut === 'REJETEE' && updated.motifRejet?.includes('trois minutes')) {
            Toast.show({
              type: 'error',
              text1: 'Délai dépassé',
              text2: 'Votre dépôt a été refusé car le paiement n’a pas été détecté dans les trois minutes. Vous pouvez recommencer depuis le chat.',
            });
          } else {
            router.push('/user_transactions');
          }
        }
      } catch {
        // Une erreur réseau ponctuelle ne doit pas interrompre le suivi.
      } finally {
        pollBusyRef.current = false;
      }
    }, 3000);

    return stopTransactionPolling;
  }, [mode, pollingTransactionId, resetForm, stopTransactionPolling]);

  // ── Nouveau design : suivi en direct du retrait ─────────────────────────
  const trackingWithdrawalId = DEPOSIT_DESIGN_V2 && mode === 'withdrawal' && withdrawalStep === 4
    ? transaction?.trackingId
    : undefined;
  useEffect(() => {
    if (!trackingWithdrawalId) return;
    let stopped = false;
    const socket = socketService.getSocket();
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      stopped = true;
      if (timer) clearInterval(timer);
      socket?.off('transactionStatusChanged', onChange);
    };
    const refresh = () => transactionService.getById(trackingWithdrawalId)
      .then((updated) => {
        if (stopped) return;
        setTransaction(updated);
        if (['VALIDEE', 'REJETEE', 'ANNULEE'].includes(updated.statut)) stop();
      })
      .catch(() => { /* next tick retries */ });
    const onChange = (event: { transactionId?: string; trackingId?: string }) => {
      if ((event.transactionId ?? event.trackingId) === trackingWithdrawalId) void refresh();
    };
    timer = setInterval(refresh, 5000);
    socket?.on('transactionStatusChanged', onChange);
    return stop;
  }, [trackingWithdrawalId]);

  // ── Nouveau design : heure de chaque étape franchie du dépôt ───────────
  const [depositStageTimes, setDepositStageTimes] = useState<Record<number, string>>({});
  const stageTransactionId = transaction?.type === 'DEPOT' ? transaction.trackingId : undefined;
  useEffect(() => {
    if (!stageTransactionId) { setDepositStageTimes({}); return; }
    setDepositStageTimes((times) => (times[paymentProgressStep]
      ? times
      : { ...times, [paymentProgressStep]: new Date().toISOString() }));
  }, [paymentProgressStep, stageTransactionId]);

  // "Le paiement tarde" appears 5 minutes after the deposit was created.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!DEPOSIT_DESIGN_V2 || mode !== 'deposit' || !stageTransactionId) return;
    const timer = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [mode, stageTransactionId]);
  const depositIsLate = !!transaction
    && paymentProgressStep === 1
    && ['EN_ATTENTE_AUTO', 'EN_VERIFICATION', 'EN_ATTENTE_PREUVE'].includes(transaction.statut)
    && nowTick - new Date(transaction.createdAt).getTime() > 5 * 60_000;

  const depositTimeline: TimelineStep[] = (() => {
    const t = transaction;
    const reached = t ? paymentProgressStep : 0;
    const time = (step: number) => formatClock(depositStageTimes[step]);
    return [
      {
        label: paymentCodeCopied ? 'Code copié' : 'Code lancé',
        state: t ? 'done' : 'active',
        sub: t ? null : 'Touchez « Effectuer le paiement » ci-dessous',
        time: t ? formatClock(t.createdAt) : null,
      },
      {
        label: 'Paiement reçu',
        state: reached >= 2 ? 'done' : t ? 'active' : 'todo',
        sub: t?.referencePaiement
          ? `Réf. ${currentOperator?.nom ?? ''} ${t.referencePaiement}`
          : t ? `En attente de votre paiement ${currentOperator?.nom ?? ''}…` : null,
        time: reached >= 2 ? time(2) ?? time(reached) : null,
      },
      {
        label: t?.creditError ? 'Crédit à vérifier' : 'Crédit en cours',
        state: t?.creditError ? 'error' : reached >= 4 ? 'done' : reached >= 2 ? 'active' : 'todo',
        sub: t?.creditError
          ? 'Notre équipe vérifie votre paiement.'
          : reached === 2 || reached === 3 ? `Nous rechargeons votre compte ${bookmakerName}…` : null,
        time: reached >= 4 ? time(4) : null,
      },
      {
        label: 'Compte crédité',
        state: reached >= 4 ? 'done' : 'todo',
        time: reached >= 4 ? formatClock(t?.dateValidation) ?? time(4) : null,
      },
    ];
  })();

  const withdrawalTimeline: TimelineStep[] = (() => {
    const t = transaction;
    const refused = t?.statut === 'REJETEE' || t?.statut === 'ANNULEE';
    const done = t?.statut === 'VALIDEE';
    const third: TimelineStep = refused
      ? { label: t?.statut === 'ANNULEE' ? 'Retrait annulé' : 'Retrait refusé', state: 'error', sub: t?.motifRejet || 'Écrivez-nous dans la discussion.' }
      : { label: done ? 'Argent envoyé' : 'Envoi en cours', state: done ? 'done' : 'active', sub: done ? null : `Nous envoyons l’argent sur votre ${currentOperator?.nom ?? 'Mobile Money'}…` };
    return [
      { label: 'Demande envoyée', state: 'done', time: formatClock(t?.createdAt) },
      {
        label: `Code ${bookmakerName} vérifié`,
        state: 'done',
        sub: t?.montant ? `Compte débité de ${t.montant.toLocaleString('fr-FR')} FCFA` : null,
        time: formatClock(t?.createdAt),
      },
      third,
      { label: 'Retrait reçu', state: done ? 'done' : 'todo', time: done ? formatClock(t?.dateValidation ?? t?.updatedAt) : null },
    ];
  })();

  // Chips of what is already chosen; touching one goes back to that step (until the deposit is created).
  const depositChips: SummaryChip[] = [];
  if (depositStep !== 0 && selectedBookmaker) {
    depositChips.push({ key: 'bk', label: selectedBookmaker.nom, onPress: transaction ? undefined : () => setDepositStep(0) });
  }
  if ([4, 2, 3, 5].includes(depositStep) && currentOperator) {
    depositChips.push({ key: 'op', label: currentOperator.nom, onPress: transaction ? undefined : () => setDepositStep(1) });
  }
  if ([2, 3, 5].includes(depositStep) && accountId.trim()) {
    depositChips.push({ key: 'id', label: `ID ${accountId.trim()}`, onPress: transaction ? undefined : () => setDepositStep(4) });
  }
  // Dot index → deposit step (amount and number share one screen in the new design).
  const depositDotSteps: DepositStep[] = [0, 1, 4, 2, 5];

  const withdrawalChips: SummaryChip[] = [];
  if (withdrawalStep > 0 && withdrawalStep < 4 && selectedBookmaker) {
    withdrawalChips.push({ key: 'bk', label: selectedBookmaker.nom, onPress: () => setWithdrawalStep(0) });
  }
  if (withdrawalStep > 1 && withdrawalStep < 4 && currentOperator) {
    withdrawalChips.push({ key: 'op', label: currentOperator.nom, onPress: () => setWithdrawalStep(1) });
  }
  if (withdrawalStep === 3 && withdrawalAccountId.trim()) {
    withdrawalChips.push({ key: 'id', label: `ID ${withdrawalAccountId.trim()}`, onPress: () => setWithdrawalStep(2) });
  }

  // New design: "Payer" launches the payment right away (on the web, it shows the code to copy).
  const payNow = async () => {
    const parsedAmount = parseAmount(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 300) {
      Alert.alert('Montant invalide', 'Le montant minimum de dépôt est de 300 FCFA.');
      return;
    }
    if (!depositPhoneValid) {
      Toast.show({ type: 'error', text1: 'Numéro invalide', text2: 'Vérifiez le format du numéro pour le pays sélectionné.' });
      return;
    }
    if (Platform.OS === 'web') {
      await createDepositAndContinue();
      return;
    }
    setDepositStep(5);
    void beginDeposit();
  };

  const payFromAnotherPhone = () => {
    if (!depositPhoneValid || parseAmount(amount) < 300) return;
    setDepositStep(5);
    void copyDepositCode();
  };

  // ── Ouvrir le composeur USSD ─────────────────────────────────────────────
  // ── Ouvrir le bookmaker (liens fournis par le serveur) ─────────────────
  const openBookmaker = async () => {
    const siteUrl = selectedBookmaker?.siteUrl;
    // A browser cannot open the bookmaker's app: open its website in a new tab instead.
    if (Platform.OS === 'web') {
      if (siteUrl) window.open(siteUrl, '_blank');
      return;
    }
    for (const scheme of selectedBookmaker?.appSchemes ?? []) {
      try {
        const canOpen = await Linking.canOpenURL(scheme);
        if (canOpen) {
          await Linking.openURL(scheme);
          return;
        }
      } catch { }
    }
    if (siteUrl) {
      try {
        await Linking.openURL(siteUrl);
        return;
      } catch { }
    }
    Alert.alert(
      `Impossible d'ouvrir ${bookmakerName}`,
      `Veuillez ouvrir l'application ${bookmakerName} manuellement.`,
    );
  };
  const insets = useSafeAreaInsets();
  const wide = useWideWeb();

  // ── Étape 0 (dépôt et retrait) : choix du bookmaker ────────────────────
  const renderBookmakerStep = (onNext: () => void) => (
    <>
      <Text style={st.pageTitle}>Choisir le bookmaker</Text>
      <Text style={st.pageSubtitle}>Sur quel compte voulez-vous faire l’opération ?</Text>
      {loadingBookmakers ? (
        <ActivityIndicator color={Colors.primaryGreen} style={{ marginVertical: 32 }} />
      ) : bookmakers.length === 0 ? (
        <View style={st.connectionErrorBox}>
          <WifiOff color="#f59e0b" size={22} />
          <Text style={st.connectionErrorText}>
            Veuillez vérifier votre connexion pour pouvoir utiliser cette fonctionnalité.
          </Text>
          <TouchableOpacity style={st.retryBtn} onPress={loadBookmakers} activeOpacity={0.8}>
            <Text style={st.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={st.bookmakerGrid}>
          {bookmakers.map((bookmaker) => {
            const selected = bookmaker.code === bookmakerCode;
            return (
              <TouchableOpacity
                key={bookmaker.code}
                style={[
                  st.bookmakerCard,
                  selected && st.bookmakerCardActive,
                  !bookmaker.active && st.bookmakerCardInactive,
                ]}
                onPress={() => selectBookmaker(bookmaker)}
                activeOpacity={bookmaker.active ? 0.8 : 1}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !bookmaker.active }}
                accessibilityLabel={bookmaker.active ? bookmaker.nom : `${bookmaker.nom}, bientôt disponible`}
              >
                <BookmakerImage imageUrl={bookmaker.imageUrl} style={st.bookmakerImage} />
                <View style={st.bookmakerCardFooter}>
                  <Text style={st.bookmakerCardName}>{bookmaker.nom}</Text>
                  {!bookmaker.active && <Text style={st.bookmakerSoonBadge}>Bientôt</Text>}
                </View>
                {selected && (
                  <View style={st.operatorCheckBadge}>
                    <Check color="#fff" size={12} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <GreenButton
        title="Suivant →"
        onPress={() => { if (selectedBookmaker?.active) onNext(); }}
        disabled={!selectedBookmaker?.active || loadingBookmakers}
        style={st.pageBtn}
      />
    </>
  );

  // ─── Nouveau design (DEPOSIT_DESIGN_V2) ──────────────────────────────────
  const renderAmountAndNumber = () => {
    const value = parseAmount(amount);
    const amountOk = Number.isFinite(value) && value >= 300;
    const savedPhone = operatorId ? lastUsedInputs?.phoneByOperator?.[operatorId]?.phoneNumber : undefined;
    return (
      <>
        {/* Same look as the amount step before the redesign: a plain input box, no card around it. */}
        <Text style={st.pageTitle}>Montant du dépôt</Text>
        <Text style={st.pageSubtitle}>Entrez le montant en FCFA</Text>
        <View>
          <View style={st.amountInputWrap}>
            <TextInput
              style={st.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              value={amount}
              onChangeText={(text) => setAmount(formatAmountInput(text))}
              maxLength={9}
              keyboardType="numeric"
              accessibilityLabel="Montant à déposer"
            />
            <Text style={st.amountCurrency}>FCFA</Text>
          </View>
          <View style={st.chips}>
            {['1 000', '2 000', '5 000', '10 000', '25 000'].map((v) => (
              <TouchableOpacity key={v} style={[st.chip, amount === v && st.chipActive]} onPress={() => setAmount(v)}>
                <Text style={[st.chipText, amount === v && st.chipTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!amount && !amountOk && <Text style={st.errorText}>Le montant minimum est de 300 FCFA</Text>}
        </View>

        <View style={{ marginTop: 22, gap: 10 }}>
          <Text style={[st.pageSubtitle, { marginBottom: 0 }]}>Numéro {currentOperator?.nom} qui paie</Text>
          <View style={st.phoneInputWrap}>
            <TouchableOpacity style={st.countrySelector} onPress={() => setShowDepositPicker(true)} activeOpacity={0.7}>
              <CountryPicker
                countryCode={countryCode}
                withFlag
                withEmoji
                withFilter
                withCallingCode
                withAlphaFilter
                theme={DARK_THEME}
                onSelect={(country: Country) => {
                  setCountryCode(country.cca2);
                  setCallingCode(country.callingCode[0]);
                  setShowDepositPicker(false);
                }}
                visible={showDepositPicker}
                onClose={() => setShowDepositPicker(false)}
                containerButtonStyle={st.pickerHidden}
              />
              <Text style={st.callingCodeText}>+{callingCode}</Text>
              <ChevronDown color={Colors.textSecondary} size={14} />
            </TouchableOpacity>
            <View style={st.phoneDivider} />
            <TextInput
              style={st.phoneInput}
              placeholder="XX XX XX XX"
              placeholderTextColor={Colors.textSecondary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              onBlur={() => setPhoneNumber((v) => formatPhoneForCountry(v, countryCode))}
              keyboardType="phone-pad"
            />
            {depositPhoneValid && <CheckCircle2 color={Colors.primaryGreen} size={20} style={st.phoneValidIcon} />}
          </View>
          {!!phoneNumber.trim() && !depositPhoneValid && (
            <Text style={st.phoneValidationError}>Numéro invalide pour le pays sélectionné.</Text>
          )}
          {!!savedPhone && savedPhone === phoneNumber.trim() && (
            <Text style={flowStyles.hint}>Repris de votre dernier dépôt {currentOperator?.nom}.</Text>
          )}
        </View>

        <GreenButton
          title={creatingTransaction ? 'Création du dépôt...' : amountOk ? `Payer ${formatAmountInput(String(value))} FCFA` : 'Payer'}
          onPress={() => void payNow()}
          disabled={!amountOk || !depositPhoneValid || creatingTransaction}
          style={st.pageBtn}
        />
        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={flowStyles.linkBtn}
            onPress={payFromAnotherPhone}
            disabled={!amountOk || !depositPhoneValid || creatingTransaction}
            activeOpacity={0.8}
          >
            <Copy color={Colors.primaryGreen} size={16} />
            <Text style={flowStyles.linkBtnText}>Payer depuis un autre téléphone (copier le code)</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderDepositTracking = () => (
    <>
      <AmountHero
        top={`Dépôt sur ${bookmakerName} · ID ${accountId.trim()}`}
        amount={formatAmountInput(String(transaction?.montant ?? parseAmount(amount)))}
        bottom={`${currentOperator?.nom ?? ''} · ${phone}`}
      />
      <StatusTimeline steps={depositTimeline} />
      {!!transaction && !transaction.creditError && paymentProgressStep < 4 && (
        <View style={flowStyles.infoBox}>
          <Info color={Colors.textSecondary} size={18} />
          <Text style={flowStyles.infoText}>Vous pouvez quitter cet écran : vous recevrez une notification dès que votre compte est crédité.</Text>
        </View>
      )}
      {depositIsLate && (
        <View style={flowStyles.lateBox}>
          <Text style={flowStyles.lateTitle}>Le paiement tarde ?</Text>
          <Text style={flowStyles.lateText}>
            Vérifiez le SMS de {currentOperator?.nom}. Si l’argent est bien parti, faites une réclamation depuis vos transactions.
          </Text>
          <TouchableOpacity onPress={() => router.push('/user_transactions')} accessibilityRole="link">
            <Text style={flowStyles.lateLink}>Voir mes transactions</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderDepositSuccess = (t: Transaction) => {
    const bkName = bookmakers.find((b) => b.code === t.bookmaker)?.nom || t.bookmaker || bookmakerName;
    const duration = formatDuration(t.createdAt, t.dateValidation ?? t.updatedAt);
    const rows = [
      { label: 'Compte', value: `${bkName} · ${t.compteDestinataire ?? ''}` },
      { label: 'Payé avec', value: `${t.operateur ?? ''} · ${t.numeroTelephone ?? ''}` },
      ...(t.referencePaiement ? [{ label: 'Référence', value: t.referencePaiement }] : []),
      ...(duration ? [{ label: 'Durée', value: duration, highlight: true }] : []),
    ];
    return (
      <View>
        <SuccessCheck />
        <Text style={flowStyles.successTitle}>Compte crédité</Text>
        <Text style={flowStyles.successText}>
          {t.montant.toLocaleString('fr-FR')} FCFA ont été ajoutés à votre compte {bkName}.
        </Text>
        <RecapCard rows={rows} />
        {Platform.OS !== 'ios' && (
          <GreenButton title={`Ouvrir ${bkName}`} onPress={() => void openBookmaker()} style={st.pageBtn} />
        )}
        <TouchableOpacity
          style={flowStyles.secondaryBtn}
          onPress={() => { resetForm(); setMode('deposit'); }}
          activeOpacity={0.85}
        >
          <Text style={flowStyles.secondaryBtnText}>Refaire un dépôt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={flowStyles.linkBtn} onPress={resetForm} activeOpacity={0.8}>
          <Text style={flowStyles.linkBtnText}>Retour à la discussion</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWithdrawalTracking = () => {
    const done = transaction?.statut === 'VALIDEE';
    return (
      <>
        {done && <SuccessCheck />}
        {done && <Text style={flowStyles.successTitle}>Retrait envoyé</Text>}
        <View style={{ marginTop: done ? 16 : 0 }}>
          <AmountHero
            top={`Retrait depuis ${bookmakerName} · ID ${withdrawalAccountId.trim()}`}
            amount={transaction?.montant ? transaction.montant.toLocaleString('fr-FR') : '—'}
            bottom={`Vers ${currentOperator?.nom ?? ''} · ${withdrawalPhone}`}
          />
        </View>
        <StatusTimeline steps={withdrawalTimeline} />
        {!done && (
          <View style={flowStyles.infoBox}>
            <Info color={Colors.textSecondary} size={18} />
            <Text style={flowStyles.infoText}>
              Vous recevrez le SMS de {currentOperator?.nom ?? 'votre opérateur'} et une notification Matistore dès que l’argent est envoyé.
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={flowStyles.secondaryBtn}
          onPress={() => router.push('/user_transactions')}
          activeOpacity={0.85}
        >
          <Text style={flowStyles.secondaryBtnText}>Voir mes transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={flowStyles.linkBtn} onPress={resetForm} activeOpacity={0.8}>
          <Text style={flowStyles.linkBtnText}>{done ? 'Retour à la discussion' : 'Écrire au support'}</Text>
        </TouchableOpacity>
      </>
    );
  };

  // ─── DEPOSIT ─────────────────────────────────────────────────────────────
  if (mode === 'deposit') {
    return (
      <>
        <KeyboardAvoidingView
          style={[
            st.container,
            { paddingBottom: Platform.OS === 'android' ? insets.bottom : 0 }
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <View style={st.header}>
            <TouchableOpacity onPress={resetForm} style={st.backBtn}>
              <ArrowLeft color={Colors.white} size={24} />
            </TouchableOpacity>
            <View style={st.headerInfo}>
              <Text style={st.headerName} numberOfLines={1} ellipsizeMode="tail">Dépôt</Text>
              <Text style={st.headerStatus}>
                {DEPOSIT_DESIGN_V2 && depositSucceeded ? 'Terminé' : `Étape ${depositProgressStep} sur 5`}
              </Text>
            </View>
            {DEPOSIT_DESIGN_V2 && depositStep === 5 && !!transaction && !depositSucceeded
              && !['VALIDEE', 'REJETEE', 'ANNULEE'].includes(transaction.statut) && <LiveBadge />}
          </View>
          {DEPOSIT_DESIGN_V2 && !depositSucceeded && (
            <StepDots
              labels={['Bookmaker', 'Opérateur', 'Compte', 'Montant', 'Paiement']}
              current={depositProgressStep}
              onPressStep={transaction ? undefined : (index) => setDepositStep(depositDotSteps[index])}
            />
          )}
          <View style={[st.stepBar, { display: 'none' }]}>
            {depositProgressLabels.map((label, index) => (
              <View key={label} style={st.depositProgressItem}>
                <View
                  style={[
                    st.stepSegment,
                    depositProgressStep >= index + 1 && st.stepSegmentActive,
                  ]}
                />
                <Text style={[
                  st.depositProgressLabel,
                  depositProgressStep === index + 1 && st.depositProgressLabelActive,
                ]}>{label}</Text>
              </View>
            ))}
          </View>

          {!depositCaptureAvailable && !transaction && (
            <View style={st.captureUnavailableBox}>
              <Text style={st.captureUnavailableTitle}>Dépôts temporairement indisponibles</Text>
              <Text style={st.captureUnavailableText}>La vérification des paiements est temporairement indisponible. Vous pourrez reprendre votre dépôt dès que le service sera rétabli.</Text>
            </View>
          )}

          <ScrollView
            contentContainerStyle={[st.pageContent, wide && webSidebarStyles.readable]}
            keyboardShouldPersistTaps="handled"
          >
            {DEPOSIT_DESIGN_V2 && depositSucceeded ? renderDepositSuccess(depositSucceeded) : (
            <StepWrap stepKey={depositStep}>
            {DEPOSIT_DESIGN_V2 && <SummaryChips chips={depositChips} />}
            {/* ── Étape 0 : Choix du bookmaker ──────────────────────────── */}
            {depositStep === 0 && renderBookmakerStep(() => setDepositStep(1))}

            {/* ── Étape 1 : Choix opérateur ──────────────────────────────── */}
            {depositStep === 1 && (
              <>
                <Text style={st.pageTitle}>Choisir l'opérateur</Text>
                <Text style={st.pageSubtitle}>
                  Sélectionnez votre réseau de paiement mobile
                </Text>
                {loadingOperators ? (
                  <ActivityIndicator
                    color={Colors.primaryGreen}
                    style={{ marginVertical: 32 }}
                  />
                ) : operators.length === 0 ? (
                  <View style={st.connectionErrorBox}>
                    <WifiOff color="#f59e0b" size={22} />
                    <Text style={st.connectionErrorText}>
                      Veuillez vérifier votre connexion pour pouvoir utiliser cette fonctionnalité.
                    </Text>
                    <TouchableOpacity style={st.retryBtn} onPress={loadOperators} activeOpacity={0.8}>
                      <Text style={st.retryBtnText}>Réessayer</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <OperatorCircles operators={operators} selectedId={operatorId} onSelect={selectOperator} />

                )}
                <GreenButton
                  title="Suivant →"
                  onPress={() => operatorId && setDepositStep(4)}
                  disabled={!operatorId || loadingOperators}
                  style={st.pageBtn}
                />
              </>
            )}

            {/* ── Étape 2 : Montant ──────────────────────────────────────── */}
            {depositStep === 2 && DEPOSIT_DESIGN_V2 && renderAmountAndNumber()}
            {depositStep === 2 && !DEPOSIT_DESIGN_V2 && (
              <>
                <Text style={st.pageTitle}>Montant du dépôt</Text>
                <Text style={st.pageSubtitle}>Entrez le montant en FCFA</Text>
                <View style={st.amountInputWrap}>
                  <TextInput
                    style={st.amountInput}
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    value={amount}
                    onChangeText={(text) => setAmount(formatAmountInput(text))}
                    maxLength={9}
                    keyboardType="numeric"
                  />
                  <Text style={st.amountCurrency}>FCFA</Text>
                </View>
                <View style={st.chips}>
                  {['5 000', '10 000', '25 000', '50 000', '100 000'].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[st.chip, amount === v && st.chipActive]}
                      onPress={() => setAmount(v)}
                    >
                      <Text
                        style={[st.chipText, amount === v && st.chipTextActive]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {!!amount && parseAmount(amount) < 300 && (
                  <Text style={st.errorText}>
                    Le montant minimum est de 300 FCFA
                  </Text>
                )}
                <GreenButton
                  title="Suivant →"
                  onPress={() => {
                    const numAmount = parseAmount(amount);
                    if (!amount || isNaN(numAmount) || numAmount < 300) {
                      Alert.alert(
                        "Montant invalide",
                        "Le montant minimum de dépôt est de 300 FCFA.",
                        [{ text: "OK" }]
                      );
                      return;
                    }
                    setDepositStep(3);
                  }}
                  disabled={!amount || isNaN(parseAmount(amount)) || parseAmount(amount) < 300}
                  style={st.pageBtn}
                />
              </>
            )}

            {/* ── Étape 3 : Numéro ───────────────────────────────────────── */}
            {depositStep === 3 && (
              <>
                <Text style={st.pageTitle}>Numéro de dépôt</Text>
                <Text style={st.pageSubtitle}>
                  Numéro {currentOperator?.nom} à utiliser pour le dépôt
                </Text>
                <View style={st.phoneInputWrap}>
                  <TouchableOpacity
                    style={st.countrySelector}
                    onPress={() => setShowDepositPicker(true)}
                    activeOpacity={0.7}
                  >
                    <CountryPicker
                      countryCode={countryCode}
                      withFlag
                      withEmoji
                      withFilter
                      withCallingCode
                      withAlphaFilter
                      theme={DARK_THEME}
                      onSelect={(country: Country) => {
                        setCountryCode(country.cca2);
                        setCallingCode(country.callingCode[0]);
                        setShowDepositPicker(false);
                      }}
                      visible={showDepositPicker}
                      onClose={() => setShowDepositPicker(false)}
                      containerButtonStyle={st.pickerHidden}
                    />
                    <Text style={st.callingCodeText}>+{callingCode}</Text>
                    <ChevronDown color={Colors.textSecondary} size={14} />
                  </TouchableOpacity>
                  <View style={st.phoneDivider} />
                  <TextInput
                    style={st.phoneInput}
                    placeholder="XX XX XX XX"
                    placeholderTextColor={Colors.textSecondary}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    onBlur={() => setPhoneNumber((value) => formatPhoneForCountry(value, countryCode))}
                    keyboardType="phone-pad"
                  />
                  {depositPhoneValid && <CheckCircle2 color={Colors.primaryGreen} size={20} style={st.phoneValidIcon} />}
                </View>
                {!!phoneNumber.trim() && !depositPhoneValid && (
                  <Text style={st.phoneValidationError}>Numéro invalide pour le pays sélectionné.</Text>
                )}
                <GreenButton
                  title={creatingTransaction ? 'Création du dépôt...' : 'Préparer le paiement →'}
                  onPress={() => void createDepositAndContinue()}
                  disabled={!depositPhoneValid || creatingTransaction}
                  style={st.pageBtn}
                />
              </>
            )}

            {/* ── Étape 4 : ID de compte ─────────────────────────────────── */}
            {depositStep === 4 && (
              <>
                <Text style={st.pageTitle}>Identifiant de compte</Text>
                <Text style={st.pageSubtitle}>
                  Saisissez ou collez votre ID de compte {bookmakerName}. Le nom du joueur doit être vérifié avant de continuer.
                </Text>
                {!!lastAccountId && lastAccountId !== accountId.trim() && (
                  <TouchableOpacity
                    style={st.lastUsedAccountCard}
                    onPress={() => setAccountId(lastAccountId)}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={`Utiliser l’identifiant ${bookmakerName} ${lastAccountId} déjà utilisé`}
                  >
                    <View style={st.lastUsedAccountIcon}><Check color={Colors.primaryGreen} size={18} strokeWidth={2.6} /></View>
                    <View style={st.lastUsedAccountCopy}>
                      <Text style={st.lastUsedAccountLabel}>Identifiant utilisé récemment</Text>
                      <Text style={st.lastUsedAccountValue}>{lastAccountId}</Text>
                    </View>
                    <Text style={st.lastUsedAccountAction}>Utiliser →</Text>
                  </TouchableOpacity>
                )}
                <View style={st.inputWrapWithIcon}>
                  <TextInput
                    style={[st.pageInput, { flex: 1 }]}
                    placeholder="Ex: 123456789"
                    placeholderTextColor={Colors.textSecondary}
                    value={accountId}
                    onChangeText={setAccountId}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                  />
                  {depositPlayerValidation.checking && (
                    <ActivityIndicator color={Colors.primaryGreen} style={{ marginHorizontal: 10 }} />
                  )}
                  <TouchableOpacity
                    style={st.pasteBtn}
                    onPress={async () => {
                    setAccountId((await Clipboard.getString()).trim());
                    }}
                  >
                    <Copy color={Colors.primaryGreen} size={18} />
                  </TouchableOpacity>
                </View>
                {DEPOSIT_DESIGN_V2 && depositPlayerValidation.player && (
                  <PlayerFoundCard name={depositPlayerValidation.player.name} bookmakerName={bookmakerName} />
                )}
                {!DEPOSIT_DESIGN_V2 && depositPlayerValidation.player && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Check color={Colors.primaryGreen} size={16} />
                    <Text style={{ color: Colors.primaryGreen, marginLeft: 6 }}>
                      {depositPlayerValidation.player.name
                        ? `Utilisateur trouvé : ${depositPlayerValidation.player.name}`
                        : `Compte ${bookmakerName} trouvé`}
                    </Text>
                  </View>
                )}
                {depositPlayerValidation.error && (
                  <Text style={st.errorText}>{depositPlayerValidation.error}</Text>
                )}
                <GreenButton
                  title={DEPOSIT_DESIGN_V2 ? 'Continuer →' : 'Suivant →'}
                  onPress={() => void prepareDeposit()}
                  disabled={
                    !accountId.trim()
                    || creatingTransaction
                    || depositPlayerValidation.checking
                    || depositPlayerValidation.player?.userId !== Number(accountId.trim())
                  }
                  style={st.pageBtn}
                />
              </>
            )}

            {/* ── Étape 5 : Effectuer le transfert ──────────────────────── */}
            {depositStep === 5 && currentOperator && (
              <>
                {DEPOSIT_DESIGN_V2 && renderDepositTracking()}
                {!DEPOSIT_DESIGN_V2 && <Text style={st.pageTitle}>Effectuer le transfert</Text>}
                {!DEPOSIT_DESIGN_V2 && (
                <Text style={st.pageSubtitle}>
                  Utilisez le code ci-dessous pour transférer {amount} FCFA via{' '}
                  {currentOperator.nom} vers le compte de matistore
                </Text>
                )}
                {!DEPOSIT_DESIGN_V2 && transaction && ['EN_ATTENTE_AUTO', 'EN_VERIFICATION'].includes(transaction.statut) && (
                  <View style={st.depositPendingIndicator}>
                    <ActivityIndicator color={Colors.primaryGreen} size="small" />
                    <Text style={st.depositPendingText}>
                      {transaction.referencePaiement ? 'Paiement reçu, crédit en cours' : 'Paiement en attente'}
                    </Text>
                  </View>
                )}
                {!DEPOSIT_DESIGN_V2 && transaction?.statut === 'EN_ATTENTE_ADMIN' && !transaction.creditError && (
                  <View style={st.depositPendingIndicator}>
                    <ActivityIndicator color={Colors.primaryGreen} size="small" />
                    <Text style={st.depositPendingText}>Paiement reçu, crédit en cours</Text>
                  </View>
                )}
                {!DEPOSIT_DESIGN_V2 && transaction && (
                  <View style={st.paymentProgressCard}>
                    <Text style={st.paymentProgressTitle}>
                      {transaction.creditError ? 'Paiement reçu, crédit à vérifier' : 'Suivi de votre dépôt'}
                    </Text>
                    <View style={st.paymentProgressTrack}>
                      {paymentProgressLabels.map((label, index) => (
                        <View key={label} style={st.paymentProgressItem}>
                          <View style={[
                            st.paymentProgressLine,
                            paymentProgressStep >= index + 1 && st.paymentProgressLineActive,
                          ]} />
                          <Text style={[
                            st.paymentProgressLabel,
                            paymentProgressStep === index + 1 && st.paymentProgressLabelActive,
                          ]}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {!!transaction?.creditError && (
                  <View style={st.creditErrorBox}>
                    <Text style={st.creditErrorTitle}>Crédit non confirmé</Text>
                    <Text style={st.creditErrorText}>{transaction.creditError}</Text>
                    <Text style={st.creditErrorText}>
                      Montant : {transaction.montant} FCFA · Numéro : {transaction.numeroTelephone || '—'}
                      {transaction.referencePaiement ? ` · Référence : ${transaction.referencePaiement}` : ''}
                    </Text>
                  </View>
                )}
                <View style={st.codeCard}>
                  <Text style={st.codeLabel}>
                    {Platform.OS === 'ios' ? `Code de paiement ${currentOperator.nom}` : `Code USSD ${currentOperator.nom}`}
                  </Text>
                  {/* iOS: the code is not displayed, only copied (the client dials it in the Phone app). */}
                  {Platform.OS !== 'ios' && (
                  <Text style={[st.codeValue, { color: Colors.primaryGreen }]}>
                    {buildUssdCode(currentOperator, depositNumero, rawAmount)}
                  </Text>
                  )}
                  <Text style={st.codeInstructions}>
                    {Platform.OS === 'web'
                      ? 'Copiez ce code, puis composez-le sur votre téléphone avec le numéro indiqué. Nous vérifierons la réception de votre paiement.'
                      : Platform.OS === 'ios'
                      ? 'Touchez « Copier le code de paiement », ouvrez l’app Téléphone, collez le code puis appelez. Nous vérifierons la réception de votre paiement.'
                      : 'Nous lancerons le code et vérifierons la réception de votre paiement. Vous pouvez aussi le copier pour le composer sur un autre téléphone.'}
                  </Text>
                </View>
                {/* A browser can't dial USSD: on web the client copies the code and dials it on the phone.
                    iOS keeps only the copy button. */}
                {Platform.OS === 'android' && (
                <GreenButton
                  title={depositPaymentAlreadyReceived
                    ? 'Paiement déjà reçu'
                    : creatingTransaction ? 'Enregistrement...'
                    : manualDialOpened ? 'Relancer le code de paiement' : 'Effectuer le paiement →'}
                  onPress={() => {
                    // The deposit already exists once the dialer opened: reopen the phone with the
                    // same code instead of creating a second deposit.
                    if (manualDialOpened) {
                      void Linking.openURL(`tel:${encodeURIComponent(buildUssdCode(currentOperator, depositNumero, rawAmount))}`).catch(() => {});
                      return;
                    }
                    void beginDeposit();
                  }}
                  disabled={creatingTransaction || depositPaymentAlreadyReceived}
                  style={st.pageBtn}
                />
                )}
                <TouchableOpacity
                  style={[st.copyDepositCodeBtn, (creatingTransaction || depositPaymentAlreadyReceived) && st.copyDepositCodeBtnDisabled]}
                  onPress={() => void copyDepositCode()}
                  disabled={creatingTransaction || depositPaymentAlreadyReceived}
                  activeOpacity={0.8}
                >
                  <Copy color={Colors.primaryGreen} size={18} />
                  <Text style={st.copyDepositCodeText}>
                    {creatingTransaction ? 'Enregistrement...' : Platform.OS === 'ios' ? 'Copier le code de paiement' : 'Copier le code et attendre'}
                  </Text>
                </TouchableOpacity>
                {!DEPOSIT_DESIGN_V2 && processing && (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <ActivityIndicator color={Colors.primaryGreen} size="large" />
                    <Text style={{ color: Colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                      {paymentCodeCopied
                        ? 'Code copié. Composez-le sur le téléphone utilisant le numéro indiqué. Nous vérifierons la réception de votre paiement.'
                        : 'Nous vérifions automatiquement votre paiement.'}
                    </Text>
                  </View>
                )}
                {transaction && !transaction.creditError && !transaction.referencePaiement
                  && ['EN_ATTENTE_AUTO', 'EN_VERIFICATION', 'EN_ATTENTE_PREUVE'].includes(transaction.statut) && (
                  <TouchableOpacity
                    style={[st.cancelDepositBtn, cancellingDeposit && st.cancelDepositBtnDisabled]}
                    onPress={() => setShowCancelDepositSheet(true)}
                    disabled={cancellingDeposit}
                    activeOpacity={0.8}
                  >
                    {cancellingDeposit
                      ? <ActivityIndicator color="#ef4444" size="small" />
                      : <Text style={st.cancelDepositText}>Annuler le dépôt</Text>}
                  </TouchableOpacity>
                )}
              </>
            )}
            </StepWrap>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        <InfoModal
          visible={showCancelDepositSheet}
          onClose={() => setShowCancelDepositSheet(false)}
          type="warning"
          title="Annuler le dépôt ?"
          message="La demande en cours sera annulée. Si vous avez déjà envoyé l’argent, ne l’annulez pas."
          confirmText="Oui, annuler le dépôt"
          secondaryText="Continuer le dépôt"
          onConfirm={() => void cancelDeposit()}
          onSecondary={() => {}}
        />
        <InfoModal
          visible={!!withdrawalNotice}
          onClose={() => {
            const completed = withdrawalNotice?.type === 'success';
            setWithdrawalNotice(null);
            if (completed) {
              resetForm();
              router.push('/user_transactions');
            }
          }}
          type={withdrawalNotice?.type ?? 'info'}
          title={withdrawalNotice?.title ?? ''}
          message={withdrawalNotice?.message}
          confirmText="OK"
        />
      </>
    );
  }

  // ─── WITHDRAWAL ──────────────────────────────────────────────────────────
  if (mode === 'withdrawal') {
    return (
      <KeyboardAvoidingView
        style={st.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={st.header}>
          <TouchableOpacity onPress={resetForm} style={st.backBtn}>
            <ArrowLeft color={Colors.white} size={24} />
          </TouchableOpacity>
          <View style={st.headerInfo}>
            <Text style={st.headerName} numberOfLines={1} ellipsizeMode="tail">Retrait</Text>
            <Text style={st.headerStatus}>{withdrawalStep === 4 ? 'Suivi' : `Étape ${withdrawalStep + 1} sur 4`}</Text>
          </View>
          {DEPOSIT_DESIGN_V2 && withdrawalStep === 4
            && !['VALIDEE', 'REJETEE', 'ANNULEE'].includes(transaction?.statut ?? '') && <LiveBadge />}
        </View>
        {DEPOSIT_DESIGN_V2 && (
          <StepDots
            labels={['Bookmaker', 'Opérateur', 'Compte', 'Code']}
            current={withdrawalStep + 1}
            onPressStep={withdrawalStep === 4 ? undefined : (index) => setWithdrawalStep(index as WithdrawalStep)}
          />
        )}
        <View style={[st.stepBar, DEPOSIT_DESIGN_V2 && { display: 'none' }]}>
          {[0, 1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                st.stepSegment,
                withdrawalStep >= s && st.stepSegmentActive,
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={[st.pageContent, wide && webSidebarStyles.readable]}
          keyboardShouldPersistTaps="handled"
        >
          <StepWrap stepKey={withdrawalStep}>
          {DEPOSIT_DESIGN_V2 && <SummaryChips chips={withdrawalChips} />}
          {withdrawalStep === 0 && renderBookmakerStep(() => setWithdrawalStep(1))}
          {withdrawalStep === 4 && renderWithdrawalTracking()}

          {withdrawalStep === 1 && (
            <>
              <Text style={st.pageTitle}>Choisir l'opérateur</Text>
              <Text style={st.pageSubtitle}>Sélectionnez le réseau Mobile Money qui recevra votre retrait.</Text>
              {loadingOperators ? <ActivityIndicator color={Colors.primaryGreen} style={{ marginVertical: 32 }} /> : (
                <OperatorCircles
                  operators={operators.filter((op) => op.active)}
                  selectedId={operatorId}
                  onSelect={selectOperator}
                />
              )}
              {!loadingOperators && !operators.some((op) => op.active) && <Text style={st.errorText}>Aucun opérateur disponible. Réessayez plus tard.</Text>}
              <GreenButton title="Suivant →" onPress={() => operatorId && setWithdrawalStep(2)} disabled={!operatorId || loadingOperators} style={st.pageBtn} />
            </>
          )}

          {withdrawalStep === 2 && (
            <>
              <Text style={st.pageTitle}>Vérifier votre compte {bookmakerName}</Text>
              <Text style={st.pageSubtitle}>Saisissez votre ID avant de continuer.</Text>
              <Text style={st.inputLabel}>ID de compte {bookmakerName}</Text>
              {!!lastAccountId && lastAccountId !== withdrawalAccountId.trim() && (
                <TouchableOpacity
                  style={st.lastUsedAccountCard}
                  onPress={() => setWithdrawalAccountId(lastAccountId)}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={`Utiliser l’identifiant ${bookmakerName} ${lastAccountId} déjà utilisé`}
                >
                  <View style={st.lastUsedAccountIcon}><Check color={Colors.primaryGreen} size={18} strokeWidth={2.6} /></View>
                  <View style={st.lastUsedAccountCopy}>
                    <Text style={st.lastUsedAccountLabel}>Identifiant utilisé récemment</Text>
                    <Text style={st.lastUsedAccountValue}>{lastAccountId}</Text>
                  </View>
                  <Text style={st.lastUsedAccountAction}>Utiliser →</Text>
                </TouchableOpacity>
              )}
              <View style={st.inputWrapWithIcon}>
                <TextInput
                  style={[st.pageInput, { flex: 1 }]}
                  placeholder="Ex: 123456789"
                  placeholderTextColor={Colors.textSecondary}
                  value={withdrawalAccountId}
                  onChangeText={setWithdrawalAccountId}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                {withdrawalPlayerValidation.checking && (
                  <ActivityIndicator color={Colors.primaryGreen} style={{ marginHorizontal: 10 }} />
                )}
                <TouchableOpacity
                  style={st.pasteBtn}
                  onPress={async () => setWithdrawalAccountId((await Clipboard.getString()).trim())}
                >
                  <Copy color={Colors.primaryGreen} size={18} />
                </TouchableOpacity>
              </View>
              {DEPOSIT_DESIGN_V2 && withdrawalPlayerValidation.player && (
                <PlayerFoundCard name={withdrawalPlayerValidation.player.name} bookmakerName={bookmakerName} />
              )}
              {!DEPOSIT_DESIGN_V2 && withdrawalPlayerValidation.player && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Check color={Colors.primaryGreen} size={16} />
                  <Text style={{ color: Colors.primaryGreen, marginLeft: 6 }}>
                    {withdrawalPlayerValidation.player.name
                      ? `Utilisateur trouvé : ${withdrawalPlayerValidation.player.name}`
                      : `Compte ${bookmakerName} trouvé`}
                  </Text>
                </View>
              )}
              {withdrawalPlayerValidation.error && (
                <Text style={st.errorText}>{withdrawalPlayerValidation.error}</Text>
              )}
              <Text style={[st.pageTitle, { marginTop: 24 }]}>Comment effectuer un retrait ?</Text>
              <View style={st.instructionCard}>
                <Text style={st.instructionStep}>① Connectez-vous à {bookmakerName}</Text>
                <Text style={st.instructionText}>
                  Ouvrez l'application {bookmakerName} et accédez à votre
                  compte.
                </Text>
              </View>
              <View style={st.instructionCard}>
                <Text style={st.instructionStep}>
                  ③ Générez votre code de retrait
                </Text>
                <Text style={st.instructionText}>
                  Générez code unique de retrait.
                  Copiez-le et revenez dans l'application.
                </Text>
              </View>
              <View style={st.instructionCard}>
                <Text style={st.instructionStep}>④ Revenez ici</Text>
                <Text style={st.instructionText}>
                  Cliquez sur suivant pour collez votre code de retrait et renseignez votre numéro de téléphone.
                </Text>
              </View>
              {Platform.OS !== 'ios' && (
              <TouchableOpacity
                style={st.xbetBtn}
                onPress={() => void openBookmaker()}
                activeOpacity={0.85}
              >
                <ExternalLink color="#fff" size={20} />
                <Text style={st.xbetBtnText}>Ouvrir {bookmakerName}</Text>
              </TouchableOpacity>
              )}
              <GreenButton
                title={"Suivant"}
                onPress={() => setWithdrawalStep(3)}
                disabled={
                  withdrawalSubmitting
                  || !withdrawalPlayerValidation.player
                  || withdrawalPlayerValidation.player.userId !== Number(withdrawalAccountId.trim())
                  || withdrawalPlayerValidation.checking
                }
                style={st.pageBtn}
              />
            </>
          )}

          {withdrawalStep === 3 && (
            <>
              <Text style={st.pageTitle}>Saisir votre code</Text>
              <Text style={st.pageSubtitle}>
                Collez le code généré sur {bookmakerName} et entrez votre numéro Mobile
                Money
              </Text>

              <Text style={st.inputLabel}>Code de retrait {bookmakerName}</Text>
              <View style={st.inputWrapWithIcon}>
                <TextInput
                  style={[st.pageInput, { flex: 1 }]}
                  placeholder="Ex: WD-XXXXXXXX"
                  placeholderTextColor={Colors.textSecondary}
                  value={withdrawalCode}
                  onChangeText={setWithdrawalCode}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={st.pasteBtn}
                  onPress={async () => {
                    const t = await Clipboard.getString();
                    setWithdrawalCode(t);
                  }}
                >
                  <Copy color={Colors.primaryGreen} size={18} />
                </TouchableOpacity>
              </View>

              <Text style={[st.inputLabel, { marginTop: 20 }]}>
                Numéro Mobile Money
              </Text>
              <View style={st.phoneInputWrap}>
                <TouchableOpacity
                  style={st.countrySelector}
                  onPress={() => setShowWithdrawalPicker(true)}
                  activeOpacity={0.7}
                >
                  <CountryPicker
                    countryCode={wCountryCode}
                    withFlag
                    withEmoji
                    withFilter
                    withCallingCode
                    withAlphaFilter
                    theme={DARK_THEME}
                    onSelect={(country: Country) => {
                      setWCountryCode(country.cca2);
                      setWCallingCode(country.callingCode[0]);
                      setShowWithdrawalPicker(false);
                    }}
                    visible={showWithdrawalPicker}
                    onClose={() => setShowWithdrawalPicker(false)}
                    containerButtonStyle={st.pickerHidden}
                  />
                  <Text style={st.callingCodeText}>+{wCallingCode}</Text>
                  <ChevronDown color={Colors.textSecondary} size={14} />
                </TouchableOpacity>
                <View style={st.phoneDivider} />
                <TextInput
                  style={st.phoneInput}
                  placeholder="XX XX XX XX"
                  placeholderTextColor={Colors.textSecondary}
                  value={wPhoneNumber}
                  onChangeText={setWPhoneNumber}
                  onBlur={() => setWPhoneNumber((value) => formatPhoneForCountry(value, wCountryCode))}
                  keyboardType="phone-pad"
                />
                {withdrawalPhoneValid && <CheckCircle2 color={Colors.primaryGreen} size={20} style={st.phoneValidIcon} />}
              </View>
              {!!wPhoneNumber.trim() && !withdrawalPhoneValid && (
                <Text style={st.phoneValidationError}>Numéro invalide pour le pays sélectionné.</Text>
              )}
              <GreenButton
                title="Envoyer la demande ✓"
                onPress={handleWithdrawalSubmit}
                disabled={!withdrawalCode.trim() || !withdrawalPhoneValid || withdrawalSubmitting}
                style={st.pageBtn}
              />
            </>
          )}
          </StepWrap>
        </ScrollView>
        <InfoModal
          visible={!!withdrawalNotice}
          onClose={() => {
            const completed = withdrawalNotice?.type === 'success';
            setWithdrawalNotice(null);
            if (completed) {
              resetForm();
              router.push('/user_transactions');
            }
          }}
          type={withdrawalNotice?.type ?? 'info'}
          title={withdrawalNotice?.title ?? ''}
          message={withdrawalNotice?.message}
          confirmText="OK"
        />
      </KeyboardAvoidingView>
    );
  }



  // Deposit / withdrawal cards: under the chat on phones, in a side panel on a computer.
  const actionCards = (
    <View style={[st.actionRow, wide && st.actionColumn]}>
      <PressableScale
        style={[st.actionCardDeposit, st.actionCardInner, !depositCaptureAvailable && { opacity: 0.45 }]}
        onPress={() => setMode('deposit')}
        disabled={!depositCaptureAvailable}
        accessibilityLabel="Faire un dépôt"
      >
        <View style={st.actionIconWrap}>
          <ArrowDownToLine color="#050505" size={20} strokeWidth={2.6} />
        </View>
        <View style={st.actionCardCopy}>
          <Text style={st.actionCardTitle}>Dépôt</Text>
          <Text style={st.actionCardSub} numberOfLines={1}>{depositCaptureAvailable ? 'Recharger' : 'Indisponible'}</Text>
        </View>
      </PressableScale>
      <PressableScale
        style={[st.actionCardWithdrawal, st.actionCardInner]}
        onPress={() => setMode('withdrawal')}
        accessibilityLabel="Faire un retrait"
      >
        <View style={[st.actionIconWrap, st.actionIconWrapOutline]}>
          <ArrowUpFromLine color={Colors.primaryGreen} size={20} strokeWidth={2.6} />
        </View>
        <View style={st.actionCardCopy}>
          <Text style={[st.actionCardTitle, { color: Colors.primaryGreen }]}>Retrait</Text>
          <Text style={[st.actionCardSub, { color: Colors.textSecondary }]} numberOfLines={1}>Vers Mobile Money</Text>
        </View>
      </PressableScale>
    </View>
  );

  // ─── CHAT VIEW ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ChatBackground variant="finance" />
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <ChevronLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <View style={st.headerInfo}>
          <Text style={st.headerName} numberOfLines={1} ellipsizeMode="tail">Dépôt / Retrait</Text>
          {/* <Text style={st.headerStatus}>
            {loading ? '' : adminPresent ? 'En ligne' : 'Hors ligne'}
          </Text> */}
        </View>
        <TouchableOpacity
          onPress={async () => {
            await AsyncStorage.setItem(LAST_SEEN_TRANSACTIONS_KEY, new Date().toISOString()).catch(() => {});
            setHasUnseenTransaction(false);
            router.push('/user_transactions');
          }}
          style={[st.backBtn, { position: 'relative' }]}
        >
          <History color={Colors.white} size={22} />
          {hasUnseenTransaction && <View style={st.notifDot} />}
        </TouchableOpacity>
      </View>

      <WideWrap on={wide} style={st.wideBody}>
        <WideWrap on={wide} style={st.wideChat}>
          {loading ? (
            <View style={st.loader}>
              <ActivityIndicator color={Colors.primaryGreen} size="large" />
            </View>
          ) : (
            <SectionList
              ref={listRef}
              sections={sections}
              keyExtractor={(item) => item.trackingId}
              contentContainerStyle={st.msgList}
              stickySectionHeadersEnabled
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              refreshControl={
                <RefreshControl
                  refreshing={loadingMore}
                  onRefresh={loadMoreHistory}
                  tintColor={Colors.primaryGreen}
                  colors={[Colors.primaryGreen]}
                  progressBackgroundColor={Colors.cardBg}
                />
              }
              renderSectionHeader={({ section }) => <DateSeparator label={section.title} />}

              renderItem={({ item }) => (
                <ChatMessage
                  item={item}
                  currentUserId={currentUserId}
                  onImagePress={setPreviewUri}
                  // onDelete={deleteMessage}
                />
              )}
              ListEmptyComponent={() => (
                <View style={st.emptyWrap}>
                  <Text style={st.emptyText}>
                    Bonjour ! Vous pouvez effectuer vos dépôts et retraits ici.
                    {'\n'}{wide ? 'Choisissez une action à gauche.' : 'Choisissez une action ci-dessous.'}
                  </Text>
                </View>
              )}
            />
          )}

          {!wide && actionCards}

          <ChatInputBar
            text={text}
            onChangeText={setText}
            onSendText={handleSendText}
            onSendFile={handleSendFile}
            onSendSticker={handleSendSticker}
            sending={sending}
            audio={audio}
            allowStickers={false}
          />
        </WideWrap>
        {wide && (
          <View style={st.widePanel}>
            <Text style={st.widePanelTitle}>Que voulez-vous faire ?</Text>
            {actionCards}
          </View>
        )}
      </WideWrap>

      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </KeyboardAvoidingView>
  );
}

// Website on a computer: wraps children in a View; elsewhere renders them as is (the phone layout is unchanged).
function WideWrap({ on, style, children }: { on: boolean; style: any; children: ReactNode }) {
  return on ? <View style={style}>{children}</View> : <>{children}</>;
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  captureUnavailableBox: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', gap: 5 },
  captureUnavailableTitle: { color: '#FBBF24', fontSize: 13, fontWeight: '800' },
  captureUnavailableText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.secondaryBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#161616', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerName: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  headerStatus: { color: Colors.primaryGreen, fontSize: 12 },

  stepBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.secondaryBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  stepSegmentActive: { backgroundColor: Colors.primaryGreen },
  depositProgressItem: { flex: 1, alignItems: 'center', gap: 5 },
  depositProgressLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600' },
  depositProgressLabelActive: { color: Colors.white },
  notifDot: {
    position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: 5,
    backgroundColor: Colors.primaryGreen, borderWidth: 1.5, borderColor: Colors.secondaryBg,
  },

  pageContent: { padding: 20, paddingBottom: 40 },
  pageTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  pageSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  pageBtn: { width: '100%', marginTop: 20 },
  depositPendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(125,255,42,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.3)',
  },
  depositPendingText: { color: Colors.primaryGreen, fontSize: 14, fontWeight: '700' },
  paymentProgressCard: {
    gap: 12,
    padding: 14,
    marginBottom: 18,
    borderRadius: 14,
    backgroundColor: Colors.cardBg,
  },
  paymentProgressTitle: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  paymentProgressTrack: { flexDirection: 'row', gap: 5 },
  paymentProgressItem: { flex: 1, gap: 6 },
  paymentProgressLine: { height: 3, borderRadius: 2, backgroundColor: Colors.border },
  paymentProgressLineActive: { backgroundColor: Colors.primaryGreen },
  paymentProgressLabel: { color: Colors.textSecondary, fontSize: 9, lineHeight: 12 },
  paymentProgressLabelActive: { color: Colors.white, fontWeight: '700' },
  creditErrorBox: {
    gap: 8,
    padding: 14,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  creditErrorTitle: { color: '#ef4444', fontSize: 14, fontWeight: '800' },
  creditErrorText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  cancelDepositBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  cancelDepositBtnDisabled: { opacity: 0.5 },
  cancelDepositText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  copyDepositCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryGreen,
    backgroundColor: 'rgba(125,255,42,0.08)',
  },
  copyDepositCodeBtnDisabled: { opacity: 0.5 },
  copyDepositCodeText: { color: Colors.primaryGreen, fontSize: 15, fontWeight: '700' },

  operatorGrid: { gap: 10, marginBottom: 8 },
  circleRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 36, marginTop: 8, marginBottom: 8 },
  circleItem: { alignItems: 'center', gap: 10 },
  circleRing: { width: 96, height: 96, borderRadius: 48, padding: 4, borderWidth: 2.5, borderColor: 'transparent' },
  circleRingOn: { borderColor: Colors.primaryGreen },
  circleLogo: { flex: 1, borderRadius: 44, backgroundColor: '#fff', overflow: 'hidden', padding: 10 },
  circleCheck: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primaryGreen, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.darkBg },
  circleName: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  // Same shape as the bookmaker cards: the logo fills the top, the name sits under it.
  operatorCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  connectionErrorBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 16,
    marginBottom: 8,
  },
  connectionErrorText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(125,255,42,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.3)',
  },
  retryBtnText: { color: Colors.primaryGreen, fontWeight: '700', fontSize: 13 },
  operatorCardActive: { backgroundColor: 'rgba(125,255,42,0.05)' },
  bookmakerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  bookmakerCard: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
    overflow: 'hidden',
    position: 'relative',
  },
  bookmakerCardActive: {
    borderColor: Colors.primaryGreen,
  },
  bookmakerCardInactive: {
    opacity: 0.45,
  },
  bookmakerImage: {
    width: '100%',
    aspectRatio: 2,
  },
  bookmakerCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bookmakerCardName: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  bookmakerSoonBadge: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  operatorLogoFrame: {
    width: '100%',
    aspectRatio: 2,
    padding: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  operatorImage: { width: '100%', height: '100%' },
  operatorCardName: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  operatorCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 32,
    fontWeight: '800',
    paddingVertical: 16,
  },
  amountCurrency: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: 'rgba(125,255,42,0.12)',
    borderColor: Colors.primaryGreen,
  },
  chipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: Colors.primaryGreen },

  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 8,
  },
  pickerHidden: {
    opacity: 0,
    position: 'absolute',
    width: 0,
    height: 0,
  },
  callingCodeText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  phoneDivider: {
    width: 1,
    height: 22,
    backgroundColor: Colors.border,
    marginHorizontal: 10,
  },
  phoneValidIcon: { marginLeft: 8 },
  phoneValidationError: { color: '#F87171', fontSize: 11, marginTop: 2, marginBottom: 8 },
  phoneInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    paddingVertical: 14,
  },

  inputWrap: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  inputWrapWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  pageInput: { color: Colors.white, fontSize: 16, paddingVertical: 14 },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  pasteBtn: { padding: 8 },
  lastUsedAccountCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(125,255,42,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.35)',
  },
  lastUsedAccountIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(125,255,42,0.14)',
  },
  lastUsedAccountCopy: { flex: 1, gap: 2 },
  lastUsedAccountLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  lastUsedAccountValue: { color: Colors.white, fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  lastUsedAccountAction: { color: Colors.primaryGreen, fontSize: 12, fontWeight: '800' },

  codeCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  codeLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  codeValue: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  codeInstructions: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  callBtnText: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },

  infoBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(125,255,42,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(125,255,42,0.2)',
    padding: 14,
    marginBottom: 4,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },


  instructionCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
  },
  instructionStep: {
    color: Colors.primaryGreen,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  instructionText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  xbetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 4,
    backgroundColor: '#e6353a',
  },
  xbetBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  msgList: { padding: 16, gap: 6, paddingBottom: 8 },

  // panel rendered after the chat, shown on the left
  wideBody: { flex: 1, flexDirection: 'row-reverse' },
  wideChat: { flex: 1 },
  widePanel: { width: 340, padding: 20, gap: 16, borderRightWidth: 1, borderRightColor: Colors.border, backgroundColor: Colors.secondaryBg },
  widePanelTitle: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  actionColumn: { flexDirection: 'column', paddingHorizontal: 0 },
  // Option A: both buttons docked right above the message bar.
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0A0A0A',
  },
  actionCardDeposit: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: Colors.primaryGreen,
    shadowColor: Colors.primaryGreen, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  actionCardWithdrawal: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(125,255,42,0.45)',
    backgroundColor: '#141414',
  },
  actionCardInner: {
    minHeight: 64,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionCardCopy: { flex: 1, minWidth: 0 },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(5,5,5,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapOutline: { backgroundColor: 'rgba(125,255,42,0.12)' },
  actionCardTitle: { color: '#050505', fontSize: 16, fontWeight: '900' },
  actionCardSub: { color: 'rgba(5,5,5,0.62)', fontSize: 11, fontWeight: '600' },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
});
