/**
 * Permet à un écran rendu À L'INTÉRIEUR du PagerView de (tabs)/_layout.tsx
 * (Home, etc.) de faire basculer le pager sur un autre onglet, sans jamais
 * passer par le routeur.
 *
 * Pourquoi ne pas juste faire router.push('/(tabs)/events') ? Parce que
 * (tabs) est un unique écran de la Stack racine : une fois qu'on est dedans,
 * pousser une route vers un de ses sous-onglets ne fait rien (on y est déjà
 * du point de vue du routeur) — d'où le bouton "Tout voir" qui ne faisait
 * que ramener sur l'onglet déjà affiché. Un essai précédent avait "corrigé"
 * ça en appelant router.replace() à chaque changement d'onglet, mais ça
 * déclenchait un remontage complet du layout à chaque swipe/tap (écran qui
 * clignote en boucle) : cette approche évite complètement le routeur.
 */

type GoToTab = (key: string) => void;

let goToTabImpl: GoToTab | null = null;

export function registerTabNavigator(fn: GoToTab | null): void {
  goToTabImpl = fn;
}

/** Retourne true si la demande a pu être traitée (le layout des tabs est monté). */
export function goToTab(key: string): boolean {
  if (goToTabImpl) {
    goToTabImpl(key);
    return true;
  }
  return false;
}
