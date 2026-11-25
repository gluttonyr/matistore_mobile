import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * On the web, React Native's Alert.alert does nothing: confirmations ("Supprimer ?") and error
 * messages never showed. This makes it use the browser's own dialogs:
 * - 0 or 1 button: window.alert, then that button's action;
 * - 2 or more: window.confirm; OK runs the last non-"cancel" button, Annuler runs the cancel one.
 * Phones are not touched.
 */
export function installWebAlert() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];

    if (list.length <= 1) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }

    const cancel = list.find((b) => b.style === 'cancel');
    const actions = list.filter((b) => b.style !== 'cancel');
    const main = actions[actions.length - 1];
    if (window.confirm(text)) main?.onPress?.();
    else cancel?.onPress?.();
  };
}
