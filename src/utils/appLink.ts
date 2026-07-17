import { router } from 'expo-router';
import { Linking } from 'react-native';
import { goToTab } from './tabNavigation';

/**
 * Ouvre un lien de bannière/CTA : une route commençant par "/" navigue dans
 * l'app, tout le reste (URL avec ou sans protocole) s'ouvre comme un lien
 * externe classique (navigateur, app tierce, etc.).
 */
export function openAppLink(link?: string | null): void {
  if (!link) return;
  const trimmed = link.trim();
  if (!trimmed) return;

  if (trimmed.startsWith('/')) {
    // Cas particulier : un lien vers un onglet de (tabs) (ex: "/(tabs)/events").
    // router.push ne fait rien dans ce cas (on est déjà dans l'écran (tabs)) —
    // on bascule directement le pager si possible.
    const tabMatch = trimmed.match(/^\/\(tabs\)\/([^/?#]+)/);
    if (tabMatch && goToTab(tabMatch[1])) {
      return;
    }
    router.push(trimmed as any);
    return;
  }

  const url = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  Linking.openURL(url).catch(() => {});
}
