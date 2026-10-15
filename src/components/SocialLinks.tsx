import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Toast from 'react-native-toast-message';

const TIKTOK_URL = 'https://vm.tiktok.com/ZN9Dn2ApBoJ1J-yYR2x/';
const WHATSAPP_URL = 'https://wa.me/22896589141';
const TIKTOK_MARK = 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.01 1.69 4.1 1.06 1.08 2.51 1.66 4.05 1.76v3.97c-1.45-.05-2.87-.43-4.15-1.12-.56-.3-1.08-.65-1.58-1.04-.01 2.83.01 5.66-.02 8.48-.08 1.45-.56 2.86-1.39 4.05-1.34 1.97-3.62 3.25-6 3.34-1.46.08-2.92-.31-4.16-1.1-2.05-1.3-3.45-3.58-3.5-6.03-.05-1.49.36-2.98 1.19-4.22 1.19-1.82 3.22-3.08 5.4-3.27.73-.07 1.46-.03 2.18.11.02 1.46 0 2.92.01 4.38-.98-.32-2.07-.23-2.97.27-.65.36-1.19.92-1.51 1.6-.27.55-.37 1.18-.29 1.79.13 1.06.77 2.04 1.7 2.56.53.3 1.14.44 1.75.42.99-.02 1.95-.51 2.55-1.3.39-.5.62-1.11.67-1.74.03-.32.02-.64.02-.96V.02Z';

type SocialLinksProps = {
  variant?: 'toolbar' | 'contact';
};

export function SocialLinks({ variant = 'contact' }: SocialLinksProps) {
  const isToolbar = variant === 'toolbar';

  const openLink = async (url: string, label: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Lien indisponible',
        text2: `Impossible d’ouvrir ${label}.`,
      });
    }
  };

  return (
    <View style={[styles.container, isToolbar ? styles.toolbar : styles.contactSection]}>
      {!isToolbar && <Text style={styles.sectionTitle}>Nous contacter</Text>}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, isToolbar ? styles.toolbarButton : styles.contactButton, styles.tiktokButton]}
          onPress={() => void openLink(TIKTOK_URL, 'TikTok')}
          activeOpacity={0.75}
          accessibilityRole="link"
          accessibilityLabel="Ouvrir le compte TikTok MatiStore"
        >
          <Svg width={isToolbar ? 22 : 25} height={isToolbar ? 22 : 25} viewBox="0 0 24 24">
            <Path fill="#25F4EE" d={TIKTOK_MARK} transform="translate(-0.7 0.3)" />
            <Path fill="#FE2C55" d={TIKTOK_MARK} transform="translate(0.7 -0.3)" />
            <Path fill="#fff" d={TIKTOK_MARK} />
          </Svg>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isToolbar ? styles.toolbarButton : styles.contactButton, styles.whatsappButton]}
          onPress={() => void openLink(WHATSAPP_URL, 'WhatsApp')}
          activeOpacity={0.75}
          accessibilityRole="link"
          accessibilityLabel="Contacter MatiStore sur WhatsApp"
        >
          <Svg width={isToolbar ? 23 : 27} height={isToolbar ? 23 : 27} viewBox="0 0 24 24">
            <Path
              fill="#fff"
              d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.5 0 .14 5.36.14 11.94c0 2.1.55 4.15 1.6 5.96L.04 24l6.25-1.64a11.9 11.9 0 0 0 5.78 1.47h.01c6.58 0 11.94-5.36 11.94-11.94a11.86 11.86 0 0 0-3.5-8.41ZM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.87 9.87 0 0 1-1.52-5.25c0-5.46 4.44-9.9 9.9-9.9a9.84 9.84 0 0 1 7 2.9 9.84 9.84 0 0 1 2.9 7c0 5.46-4.44 9.9-9.9 9.9Zm5.43-7.41c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.8-1.49-1.78-1.66-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.09 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"
            />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbar: {
    paddingVertical: 0,
  },
  contactSection: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 10,
    gap: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  contactButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  tiktokButton: { backgroundColor: '#111', borderColor: '#292929' },
  whatsappButton: { backgroundColor: '#25D366' },
});
