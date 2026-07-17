import { ChatInputBar } from '@/components/ChatinputBar';
import { ChatMessage } from '@/components/ChatMessage';
import { ImagePreviewModal } from '@/components/ImagePreviewModel';
import GreenButton from '@/components/ui/GreenButton';
import { Colors } from '@/constants/colors';
import { DiscussionStatus } from '@/data_api/models/discussion.types';
import { MessageType } from '@/data_api/models/message.types';
import { Operateur } from '@/data_api/models/operateur.types';
import { operateurService } from '@/data_api/services/operateurService';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useChat } from '@/hooks/useChat';
import { useFileUrl } from '@/hooks/useFileUrl';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  ExternalLink,
  Info,
  Phone,
  Upload,
  WifiOff,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
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
} from 'react-native-country-picker-modal';

type Mode = 'chat' | 'deposit' | 'withdrawal';
type DepositStep = 1 | 2 | 3 | 4 | 5;
type WithdrawalStep = 1 | 2;

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

export default function DepositWithdrawalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { initialMode } = useLocalSearchParams<{ initialMode?: string }>();

  const {
    messages,
    loading,
    sending,
    sendText,
    sendFile,
    sendSticker,
    currentUserId,
  } = useChat(id);

  const [mode, setMode] = useState<Mode>('chat');
  const [depositStep, setDepositStep] = useState<DepositStep>(1);
  const [withdrawalStep, setWithdrawalStep] = useState<WithdrawalStep>(1);

  // ── Opérateurs depuis l'API ──────────────────────────────────────────────
  const [operators, setOperators] = useState<Operateur[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  const loadOperators = useCallback(() => {
    setLoadingOperators(true);
    operateurService
      .getAll()
      .then(setOperators)
      .catch(() => setOperators([]))
      .finally(() => setLoadingOperators(false));
  }, []);

  useEffect(() => {
    loadOperators();
  }, [loadOperators]);

  const [operatorId, setOperatorId] = useState('');
  const [amount, setAmount] = useState('');

  // ── Dépôt — téléphone avec sélecteur de pays ────────────────────────────
  const [countryCode, setCountryCode] = useState<CountryCode>('TG');
  const [callingCode, setCallingCode] = useState('228');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showDepositPicker, setShowDepositPicker] = useState(false);
  const phone = `+${callingCode}${phoneNumber}`;

  // ── Retrait — téléphone avec sélecteur de pays ───────────────────────────
  const [wCountryCode, setWCountryCode] = useState<CountryCode>('TG');
  const [wCallingCode, setWCallingCode] = useState('228');
  const [wPhoneNumber, setWPhoneNumber] = useState('');
  const [showWithdrawalPicker, setShowWithdrawalPicker] = useState(false);
  const withdrawalPhone = `+${wCallingCode}${wPhoneNumber}`;

  const [withdrawalCode, setWithdrawalCode] = useState('');

  // ── Preuve photo ─────────────────────────────────────────────────────────
  const [proofUri, setProofUri] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const audio = useAudioRecorder();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  useEffect(() => {
    if (initialMode === 'deposit') setMode('deposit');
    else if (initialMode === 'withdrawal') setMode('withdrawal');
  }, [initialMode]);

  const currentOperator = operators.find((o) => o.trackingId === operatorId);
  // Le montant affiché contient des espaces (séparateurs de milliers) : le code USSD
  // composé, lui, ne doit contenir que des chiffres.
  const rawAmount = amount.replace(/[^0-9]/g, '');

  // Le numéro saisi par l'utilisateur (indicatif + numéro, sans le "+") : selon
  // l'opérateur, {numero} peut apparaître 0, 1 ou plusieurs fois dans le
  // format — ou pas du tout (ex: TMoney n'en a pas besoin).
  const depositNumero = `${callingCode}${phoneNumber}`;

  const buildUssdCode = (op: Operateur, numero: string, montant: string) =>
    op.formatUssd
      .replace(/\{numero\}/g, numero)
      .replace(/\{montant\}/g, montant);

  // ── Sélection de photo ───────────────────────────────────────────────────
  const pickProofImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        "Veuillez autoriser l'accès à la galerie dans les paramètres de votre téléphone.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setProofUri(result.assets[0].uri);
    }
  };

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
  const handleDepositSubmit = async () => {
    if (!proofUri) return;

    // 1️⃣ Attendre que le message texte soit réellement confirmé par le serveur
    await sendText(
      `📥 *Demande de dépôt*\n` +
      `Opérateur : ${currentOperator?.nom || operatorId}\n` +
      `Montant : ${amount} FCFA\n` +
      `Numéro : ${phone}`,
      DiscussionStatus.DEPOT
    );

    // 2️⃣ Envoyer l'image
    const filename = proofUri.split('/').pop() ?? 'preuve.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    await sendFile(
      { uri: proofUri, name: filename, type: mimeType },
      MessageType.IMAGE,
    );

    resetForm();
  };

  // ── Soumission retrait ───────────────────────────────────────────────────
  const handleWithdrawalSubmit = async () => {
    await sendText(
      `📤 *Demande de retrait*\n` +
      `Code 1xBet : ${withdrawalCode}\n` +
      `Numéro Mobile Money : ${withdrawalPhone}`, DiscussionStatus.RETRAIT
    );

    resetForm();
  };

  const resetForm = () => {
    setMode('chat');
    setDepositStep(1);
    setWithdrawalStep(1);
    setOperatorId('');
    setAmount('');
    // Dépôt téléphone
    setPhoneNumber('');
    setCallingCode('228');
    setCountryCode('TG');
    // Retrait téléphone
    setWPhoneNumber('');
    setWCallingCode('228');
    setWCountryCode('TG');
    // Retrait code
    setWithdrawalCode('');
    setProofUri(null);
  };

  // ── Ouvrir le composeur USSD ─────────────────────────────────────────────
  const openDialer = () => {
    if (!currentOperator) return;
    const code = buildUssdCode(currentOperator, depositNumero, rawAmount);
    Linking.openURL(`tel:${encodeURIComponent(code)}`);
  };

  // ── Ouvrir 1xBet ────────────────────────────────────────────────────────
  // Schéma confirmé par inspection réelle du manifeste de l'app installée
  // (adb dumpsys package org.xbet.client1) et testé avec succès sur
  // l'émulateur (adb shell am start ... -d "xbet://open" a bien lancé 1xBet).
  // Nécessite les <queries> Android déclarées via le plugin
  // withExternalAppQueries (app.config.js) : sans ça, canOpenURL renvoie
  // toujours false depuis Android 11, même si l'app est installée. Comme
  // pour les autres modules natifs du projet, ça ne prend effet qu'après un
  // rebuild natif (dev client/EAS build) — pas dans Expo Go.
  const open1xBet = async () => {
    const appSchemes = ['xbet://open', 'xbet://openapp'];
    for (const scheme of appSchemes) {
      try {
        const canOpen = await Linking.canOpenURL(scheme);
        if (canOpen) {
          await Linking.openURL(scheme);
          return;
        }
      } catch { }
    }
    Alert.alert(
      "Impossible d'ouvrir 1xBet",
      "Veuillez ouvrir l'application 1xBet manuellement.",
    );
  };

  // ─── DEPOSIT ─────────────────────────────────────────────────────────────
  if (mode === 'deposit') {
    return (
      <KeyboardAvoidingView
        style={st.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={st.header}>
          <TouchableOpacity onPress={resetForm} style={st.backBtn}>
            <ArrowLeft color={Colors.white} size={24} />
          </TouchableOpacity>
          <View style={st.headerInfo}>
            <Text style={st.headerName}>Dépôt</Text>
            <Text style={st.headerStatus}>Étape {depositStep} sur 5</Text>
          </View>
        </View>
        <View style={st.stepBar}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View
              key={s}
              style={[st.stepSegment, depositStep >= s && st.stepSegmentActive]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={st.pageContent}
          keyboardShouldPersistTaps="handled"
        >
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
                <View style={st.operatorGrid}>
                  {operators.map((op) => (
                    <TouchableOpacity
                      key={op.trackingId}
                      style={[
                        st.operatorCard,
                        operatorId === op.trackingId && st.operatorCardActive,
                        {
                          borderColor:
                            operatorId === op.trackingId
                              ? Colors.primaryGreen
                              : Colors.border,
                        },
                      ]}
                      onPress={() => setOperatorId(op.trackingId)}
                      activeOpacity={0.8}
                    >
                      <OperatorImage
                        imageUrl={op.imageUrl}
                        style={st.operatorImage}
                      />
                      <Text style={st.operatorCardName}>{op.nom}</Text>
                      {operatorId === op.trackingId && (
                        <View style={st.operatorCheckBadge}>
                          <Check color="#fff" size={12} strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <GreenButton
                title="Suivant →"
                onPress={() => operatorId && setDepositStep(2)}
                disabled={!operatorId || loadingOperators}
                style={st.pageBtn}
              />
            </>
          )}

          {/* ── Étape 2 : Montant ──────────────────────────────────────── */}
          {depositStep === 2 && (
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
              {!!amount && parseAmount(amount) < 500 && (
                <Text style={st.errorText}>
                  Le montant minimum est de 500 FCFA
                </Text>
              )}
              <GreenButton
                title="Suivant →"
                onPress={() => {
                  const numAmount = parseAmount(amount);
                  if (!amount || isNaN(numAmount) || numAmount < 500) {
                    Alert.alert(
                      "Montant invalide",
                      "Le montant minimum de dépôt est de 500 FCFA.",
                      [{ text: "OK" }]
                    );
                    return;
                  }
                  setDepositStep(3);
                }}
                disabled={!amount || isNaN(parseAmount(amount)) || parseAmount(amount) < 500}
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
                  keyboardType="phone-pad"
                />
              </View>
              <GreenButton
                title="Suivant →"
                onPress={() => phoneNumber && setDepositStep(4)}
                disabled={!phoneNumber}
                style={st.pageBtn}
              />
            </>
          )}

          {/* ── Étape 4 : Effectuer le transfert ──────────────────────── */}
          {depositStep === 4 && currentOperator && (
            <>
              <Text style={st.pageTitle}>Effectuer le transfert</Text>
              <Text style={st.pageSubtitle}>
                Utilisez le code ci-dessous pour transférer {amount} FCFA via{' '}
                {currentOperator.nom}
              </Text>
              <View style={st.codeCard}>
                <Text style={st.codeLabel}>
                  Code USSD {currentOperator.nom}
                </Text>
                <Text style={[st.codeValue, { color: Colors.primaryGreen }]}>
                  {buildUssdCode(currentOperator, depositNumero, rawAmount)}
                </Text>
                <Text style={st.codeInstructions}>
                  Composez ce code sur votre téléphone, suivez les instructions
                  et effectuez le transfert de {amount} FCFA vers le numéro{' '}
                  {phone}.
                </Text>
              </View>
              <TouchableOpacity
                style={[st.callBtn, { backgroundColor: Colors.primaryGreen }]}
                onPress={openDialer}
                activeOpacity={0.85}
              >
                <Phone color="#000" size={20} strokeWidth={2.5} />
                <Text style={[st.callBtnText, { color: '#000' }]}>
                  Composer {buildUssdCode(currentOperator, depositNumero, rawAmount)}
                </Text>
              </TouchableOpacity>
              <View style={st.infoBox}>
                <Info color={Colors.primaryGreen} size={16} />
                <Text style={st.infoText}>
                  Après avoir fait le transfert, revenez ici et cliquez sur
                  "Suivant" pour joindre votre preuve de paiement.
                </Text>
              </View>
              <GreenButton
                title="J'ai fait le transfert →"
                onPress={() => setDepositStep(5)}
                style={st.pageBtn}
              />
            </>
          )}

          {/* ── Étape 5 : Preuve de paiement ──────────────────────────── */}
          {depositStep === 5 && (
            <>
              <Text style={st.pageTitle}>Preuve de paiement</Text>
              <Text style={st.pageSubtitle}>
                Joignez la capture d'écran de votre confirmation de transfert
              </Text>
              <TouchableOpacity
                style={[st.uploadArea, proofUri && st.uploadAreaDone]}
                onPress={pickProofImage}
                activeOpacity={0.8}
              >
                {proofUri ? (
                  <View style={st.uploadDone}>
                    <Image
                      source={{ uri: proofUri }}
                      style={st.proofThumb}
                      resizeMode="cover"
                    />
                    <Text style={st.uploadDoneTitle}>Photo sélectionnée ✓</Text>
                    <Text style={st.uploadDoneSub}>Appuyez pour changer</Text>
                  </View>
                ) : (
                  <>
                    <Upload color={Colors.textSecondary} size={36} />
                    <Text style={st.uploadTitle}>
                      Appuyez pour choisir une photo
                    </Text>
                    <Text style={st.uploadSub}>PNG ou JPG depuis la galerie</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Indication obligatoire si pas encore de photo */}
              {!proofUri && (
                <View style={st.requiredHint}>
                  <Info color="#f59e0b" size={14} />
                  <Text style={st.requiredHintText}>
                    La preuve de paiement est obligatoire pour valider le dépôt.
                  </Text>
                </View>
              )}

              <GreenButton
                title="Envoyer la demande ✓"
                onPress={handleDepositSubmit}
                disabled={!proofUri}
                style={st.pageBtn}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── WITHDRAWAL ──────────────────────────────────────────────────────────
  if (mode === 'withdrawal') {
    return (
      <KeyboardAvoidingView
        style={st.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={st.header}>
          <TouchableOpacity onPress={resetForm} style={st.backBtn}>
            <ArrowLeft color={Colors.white} size={24} />
          </TouchableOpacity>
          <View style={st.headerInfo}>
            <Text style={st.headerName}>Retrait</Text>
            <Text style={st.headerStatus}>Étape {withdrawalStep} sur 2</Text>
          </View>
        </View>
        <View style={st.stepBar}>
          {[1, 2].map((s) => (
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
          contentContainerStyle={st.pageContent}
          keyboardShouldPersistTaps="handled"
        >
          {withdrawalStep === 1 && (
            <>
              <Text style={st.pageTitle}>Comment effectuer un retrait ?</Text>
              <View style={st.instructionCard}>
                <Text style={st.instructionStep}>① Connectez-vous à 1xBet</Text>
                <Text style={st.instructionText}>
                  Ouvrez l'application ou le site 1xBet et accédez à votre
                  compte.
                </Text>
              </View>
              <View style={st.instructionCard}>
                <Text style={st.instructionStep}>② Allez dans "Retrait"</Text>
                <Text style={st.instructionText}>
                  Depuis votre profil, cliquez sur "Caisse" puis "Retrait".
                </Text>
              </View>
              <View style={st.instructionCard}>
                <Text style={st.instructionStep}>
                  ③ Générez votre code de retrait
                </Text>
                <Text style={st.instructionText}>
                  Choisissez le montant et générez votre code unique de retrait.
                  Copiez-le.
                </Text>
              </View>
              <View style={st.instructionCard}>
                <Text style={st.instructionStep}>④ Revenez ici</Text>
                <Text style={st.instructionText}>
                  Collez votre code de retrait et renseignez votre numéro Mobile
                  Money.
                </Text>
              </View>
              <TouchableOpacity
                style={st.xbetBtn}
                onPress={open1xBet}
                activeOpacity={0.85}
              >
                <ExternalLink color="#fff" size={20} />
                <Text style={st.xbetBtnText}>Ouvrir 1xBet</Text>
              </TouchableOpacity>
              <GreenButton
                title="J'ai mon code →"
                onPress={() => setWithdrawalStep(2)}
                style={[st.pageBtn, { marginTop: 12 }]}
              />
            </>
          )}

          {withdrawalStep === 2 && (
            <>
              <Text style={st.pageTitle}>Saisir votre code</Text>
              <Text style={st.pageSubtitle}>
                Collez le code généré sur 1xBet et entrez votre numéro Mobile
                Money
              </Text>

              <Text style={st.inputLabel}>Code de retrait 1xBet</Text>
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
                  keyboardType="phone-pad"
                />
              </View>

              <GreenButton
                title="Envoyer la demande ✓"
                onPress={handleWithdrawalSubmit}
                disabled={!withdrawalCode || !wPhoneNumber}
                style={st.pageBtn}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── CHAT VIEW ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <ChevronLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <View style={st.headerInfo}>
          <Text style={st.headerName}>Dépôt / Retrait</Text>
          <Text style={st.headerStatus}>
            {loading ? 'Chargement...' : 'Service disponible'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={st.loader}>
          <ActivityIndicator color={Colors.primaryGreen} size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.trackingId}
          contentContainerStyle={st.msgList}
          renderItem={({ item }) => (
            <ChatMessage
              item={item}
              currentUserId={currentUserId}
              onImagePress={setPreviewUri}
            />
          )}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={() => (
            <View style={st.emptyWrap}>
              <Text style={st.emptyText}>
                Bonjour ! Vous pouvez effectuer vos dépôts et retraits ici.
                {'\n'}Choisissez une action ci-dessous.
              </Text>
            </View>
          )}
        />
      )}

      <View style={st.actionRow}>
        <TouchableOpacity
          style={st.actionCardDeposit}
          onPress={() => setMode('deposit')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.primaryGreen, Colors.secondaryGreen]}
            style={st.actionCardInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={st.actionIconWrap}>
              <ArrowDownToLine color="#000" size={22} strokeWidth={2.5} />
            </View>
            <Text style={st.actionCardTitle}>Dépôt</Text>
            <Text style={st.actionCardSub}>Recharger votre compte</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={st.actionCardWithdrawal}
          onPress={() => setMode('withdrawal')}
          activeOpacity={0.85}
        >
          <View style={st.actionCardInner}>
            <View style={[st.actionIconWrap, st.actionIconWrapOutline]}>
              <ArrowUpFromLine
                color={Colors.primaryGreen}
                size={22}
                strokeWidth={2.5}
              />
            </View>
            <Text style={[st.actionCardTitle, { color: Colors.primaryGreen }]}>
              Retrait
            </Text>
            <Text style={st.actionCardSub}>Retirer vers Mobile Money</Text>
          </View>
        </TouchableOpacity>
      </View>

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

      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </KeyboardAvoidingView>
  );
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
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { color: Colors.white, fontSize: 16, fontWeight: '700' },
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

  operatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  operatorCard: {
    width: '30%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
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
  operatorImage: { width: 56, height: 56, marginBottom: 8 },
  operatorCardName: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
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
    borderRadius: 14,
    marginBottom: 16,
  },
  callBtnText: { fontSize: 15, fontWeight: '800' },

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

  uploadArea: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
    gap: 10,
    marginBottom: 8,
  },
  uploadAreaDone: {
    borderColor: Colors.primaryGreen,
    borderStyle: 'solid',
    backgroundColor: 'rgba(125,255,42,0.06)',
    padding: 16,
  },
  uploadDone: { alignItems: 'center', gap: 10 },
  proofThumb: {
    width: 160,
    height: 120,
    borderRadius: 10,
    marginBottom: 4,
  },
  uploadDoneTitle: {
    color: Colors.primaryGreen,
    fontSize: 16,
    fontWeight: '800',
  },
  uploadDoneSub: { color: Colors.textSecondary, fontSize: 13 },
  uploadTitle: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  uploadSub: { color: Colors.textSecondary, fontSize: 12 },

  requiredHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  requiredHintText: {
    color: '#f59e0b',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
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

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.secondaryBg,
  },
  actionCardDeposit: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  actionCardWithdrawal: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primaryGreen,
    backgroundColor: 'rgba(125,255,42,0.04)',
    overflow: 'hidden',
  },
  actionCardInner: { padding: 16, gap: 4 },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionIconWrapOutline: { backgroundColor: 'rgba(125,255,42,0.12)' },
  actionCardTitle: { color: '#000', fontSize: 16, fontWeight: '900' },
  actionCardSub: { color: 'rgba(0,0,0,0.55)', fontSize: 11, fontWeight: '600' },
  errorText: {
    color: '#ef4444',        // rouge
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
});