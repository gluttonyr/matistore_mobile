import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export type { Country, CountryCode } from 'react-native-country-picker-modal';
import type { Country, CountryCode } from 'react-native-country-picker-modal';

export const DARK_THEME = {};

// shortcut: short list of the countries MatiStore serves, extend it if clients come from elsewhere.
const COUNTRIES: { cca2: CountryCode; name: string; callingCode: string; flag: string }[] = [
  { cca2: 'TG', name: 'Togo', callingCode: '228', flag: '🇹🇬' },
  { cca2: 'BJ', name: 'Bénin', callingCode: '229', flag: '🇧🇯' },
  { cca2: 'GH', name: 'Ghana', callingCode: '233', flag: '🇬🇭' },
  { cca2: 'CI', name: "Côte d'Ivoire", callingCode: '225', flag: '🇨🇮' },
  { cca2: 'BF', name: 'Burkina Faso', callingCode: '226', flag: '🇧🇫' },
  { cca2: 'NE', name: 'Niger', callingCode: '227', flag: '🇳🇪' },
  { cca2: 'ML', name: 'Mali', callingCode: '223', flag: '🇲🇱' },
  { cca2: 'SN', name: 'Sénégal', callingCode: '221', flag: '🇸🇳' },
  { cca2: 'NG', name: 'Nigeria', callingCode: '234', flag: '🇳🇬' },
  { cca2: 'CM', name: 'Cameroun', callingCode: '237', flag: '🇨🇲' },
  { cca2: 'GN', name: 'Guinée', callingCode: '224', flag: '🇬🇳' },
  { cca2: 'GA', name: 'Gabon', callingCode: '241', flag: '🇬🇦' },
  { cca2: 'CD', name: 'RD Congo', callingCode: '243', flag: '🇨🇩' },
  { cca2: 'FR', name: 'France', callingCode: '33', flag: '🇫🇷' },
];

type Props = {
  countryCode?: CountryCode;
  visible?: boolean;
  onSelect: (country: Country) => void;
  onClose?: () => void;
  // Accepted for API parity with the native picker; ignored on web.
  [key: string]: unknown;
};

// Web stand-in: same props the screens use (countryCode, visible, onSelect, onClose), a searchable list in a modal.
export default function CountryPicker({ visible, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.callingCode.includes(q)) : COUNTRIES;
  }, [query]);

  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={styles.sheet}>
        <TextInput style={styles.search} placeholder="Rechercher un pays" placeholderTextColor="#888" value={query} onChangeText={setQuery} />
        <FlatList
          data={items}
          keyExtractor={(c) => c.cca2}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              accessibilityRole="button"
              onPress={() =>
                onSelect({ cca2: item.cca2, callingCode: [item.callingCode], name: item.name, flag: item.flag } as unknown as Country)
              }>
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.code}>+{item.callingCode}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    alignSelf: 'center',
    top: '10%',
    width: '92%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 12,
  },
  search: { backgroundColor: '#111', color: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8 },
  flag: { fontSize: 22 },
  name: { flex: 1, color: '#fff', fontSize: 15 },
  code: { color: '#A0A0A0', fontSize: 15 },
});
