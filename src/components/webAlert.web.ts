import { Alert, type AlertButton } from 'react-native';

// react-native-web's Alert.alert does nothing, so every Alert in the app was silent on the website.
// Shows them with the browser's own dialogs instead.
// shortcut: with 3+ buttons only the last non-cancel one is offered (OK) next to cancel; use a custom modal if one needs more.
Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
  const text = [title, message].filter(Boolean).join('\n\n');
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancel = buttons.find((b) => b.style === 'cancel');
  const action = buttons.filter((b) => b !== cancel).pop();
  if (window.confirm(text)) action?.onPress?.();
  else cancel?.onPress?.();
};

export {};
