// react-native-share has no web version: WhatsApp share opens wa.me with the text.
// shortcut: the image is not attached on web (a browser cannot hand a file to WhatsApp), add the event link if needed.
export const Social = { Whatsapp: 'whatsapp' } as const;

export default {
  async shareSingle({ message, title }: { social: string; message?: string; url?: string; title?: string }) {
    window.open(`https://wa.me/?text=${encodeURIComponent(message ?? title ?? '')}`, '_blank');
  },
};
