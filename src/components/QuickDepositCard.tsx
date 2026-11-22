import { Colors } from '@/constants/colors';
import { Transaction } from '@/data_api/models/transaction.types';
import { transactionService } from '@/data_api/services/transactionService';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const MIN_AMOUNT = 300;
const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const formatAmount = (value: number | string) =>
  String(value).replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const toNumber = (formatted: string) => {
  const digits = formatted.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

/** The client's last successful deposit, if it has everything needed to replay it. */
const findReplayableDeposit = (items: Transaction[]) =>
  items.find((t) => t.type === 'DEPOT' && t.statut === 'VALIDEE'
    && !!t.operateur && !!t.numeroTelephone && !!t.compteDestinataire);

type Props = {
  discussionId: string | null;
  depositsAvailable: boolean;
};

/**
 * Replays the last deposit (same bookmaker, account, operator and number) in one tap;
 * only the amount can be changed.
 */
export function QuickDepositCard({ discussionId, depositsAvailable }: Props) {
  const [last, setLast] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    transactionService.getAll({ page: 1, limit: 20 })
      .then(({ items }) => {
        if (!active) return;
        const deposit = findReplayableDeposit(items) ?? null;
        setLast(deposit);
        if (deposit) setAmount((current) => current || formatAmount(deposit.montant));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []));

  const chips = useMemo(() => {
    const values = last ? [Math.round(last.montant), ...PRESET_AMOUNTS] : PRESET_AMOUNTS;
    return [...new Set(values)].slice(0, 6);
  }, [last]);

  if (!last || !discussionId) return null;

  const value = toNumber(amount);
  const amountValid = value >= MIN_AMOUNT;
  const disabled = !depositsAvailable || !amountValid;

  const start = () => {
    if (disabled) return;
    router.push({
      pathname: '/user_chats/deposit-withdrawal',
      params: {
        id: discussionId,
        initialMode: 'deposit',
        quickOperator: last.operateur ?? '',
        quickBookmaker: last.bookmaker ?? '',
        quickPhone: last.numeroTelephone ?? '',
        quickAccount: last.compteDestinataire ?? '',
        quickAmount: String(value),
      },
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}><Zap color={Colors.primaryGreen} size={18} strokeWidth={2.6} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dépôt rapide</Text>
          <Text style={styles.details} numberOfLines={1}>
            {(last.bookmaker || '1XBET')} · ID {last.compteDestinataire}
          </Text>
          <Text style={styles.details} numberOfLines={1}>
            {last.operateur} · {last.numeroTelephone}
          </Text>
        </View>
      </View>

      <View style={styles.amountWrap}>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={(text) => setAmount(formatAmount(text))}
          keyboardType="numeric"
          maxLength={9}
          placeholder="0"
          placeholderTextColor={Colors.textSecondary}
          accessibilityLabel="Montant du dépôt rapide"
        />
        <Text style={styles.currency}>FCFA</Text>
      </View>
      <View style={styles.chips}>
        {chips.map((v) => {
          const selected = value === v;
          return (
            <TouchableOpacity key={v} style={[styles.chip, selected && styles.chipActive]} onPress={() => setAmount(formatAmount(v))}>
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{formatAmount(v)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!amount && !amountValid && <Text style={styles.error}>Le montant minimum est de {MIN_AMOUNT} FCFA</Text>}

      <TouchableOpacity onPress={start} disabled={disabled} activeOpacity={0.85} style={disabled && { opacity: 0.45 }}>
        <LinearGradient colors={[Colors.primaryGreen, Colors.secondaryGreen]} style={styles.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.buttonText}>
            {depositsAvailable ? `Déposer ${amountValid ? formatAmount(value) + ' FCFA' : ''}` : 'Dépôts temporairement indisponibles'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: Colors.secondaryBg, borderWidth: 1, borderColor: 'rgba(125,255,42,0.25)', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(125,255,42,0.1)' },
  title: { color: Colors.white, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  details: { color: Colors.textSecondary, fontSize: 12 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14 },
  amountInput: { flex: 1, color: Colors.white, fontSize: 22, fontWeight: '800', paddingVertical: 10 },
  currency: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: 'rgba(125,255,42,0.15)', borderColor: Colors.primaryGreen },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: Colors.primaryGreen },
  error: { color: Colors.error, fontSize: 12 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#000', fontSize: 15, fontWeight: '800' },
});
