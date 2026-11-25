import { Clipboard, Platform } from 'react-native';

/** Copies text; on the web through the browser clipboard (the React Native one is unreliable there). */
export async function copyText(text: string): Promise<boolean> {
  if (Platform.OS !== 'web') {
    Clipboard.setString(text);
    return true;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older or non-secure browsers: hidden textarea + execCommand.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}
