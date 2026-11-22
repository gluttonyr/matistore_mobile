# Revenir à l'interface d'avant la modernisation

La modernisation (novembre 2026) a modifié les écrans listés plus bas. Ce dossier
garde une copie de chacun **tel qu'il était juste avant**, en `.txt` pour que
l'application ne les charge pas.

## Tout remettre comme avant (1 commande)

Depuis le dossier `matistore_mobile` :

```powershell
powershell -ExecutionPolicy Bypass -File .\sauvegarde-avant-modernisation\restaurer.ps1
```

Le script remet chaque fichier à sa place et supprime les fichiers ajoutés
(liste dans `NOUVEAUX-FICHIERS.txt`). Ensuite : relancer l'appli ou reconstruire l'APK.

## Ne remettre qu'un seul écran

Copier le `.txt` voulu à sa place d'origine en retirant `.txt`. Exemple pour
l'accueil :

```powershell
Copy-Item ".\sauvegarde-avant-modernisation\src\app\(tabs)\home.tsx.txt" ".\src\app\(tabs)\home.tsx" -Force
```

Attention : certains écrans utilisent les nouveaux composants
(`PressableScale`, `FadeIn`, `FloatingTabBar`…). Si vous remettez un seul écran,
ne supprimez pas ces composants.

## Ce qui a changé

| Écran | Fichier |
|---|---|
| Barre de navigation flottante (client et admin), icône Accueil | `src/app/(tabs)/_layout.tsx`, `src/app/(admin)/_layout.tsx`, `src/components/FloatingTabBar.tsx` |
| Accueil client : Dépôt / Retrait (option 1), dernière opération, en-tête | `src/app/(tabs)/home.tsx` |
| Écran de démarrage de Noël (1er décembre – 6 janvier) | `src/app/index.tsx`, `src/components/splash/*`, `assets/splash-noel.png` |
| Fenêtre « Nouvelle version » (jamais sur le web) | `src/components/updateAvailableNodal.tsx`, `src/hooks/useVersionChech.ts` |
| Discussion Dépôt / Retrait : boutons collés à la barre (option A) | `src/app/user_chats/deposit-withdrawal.tsx` |
| Bulles, barre d'écriture, en-têtes de discussion | `src/components/ChatMessage.tsx`, `src/components/ChatinputBar.tsx`, `src/app/user_chats/[id].tsx`, `src/app/admin_chats/[id].tsx` |
| Liste des discussions | `src/app/(tabs)/chats/index.tsx` |
| Mes transactions : totaux du mois, filtres, regroupement par jour | `src/app/user_transactions/index.tsx` |
| Événements | `src/app/(tabs)/events/index.tsx` |
| Profil : chiffres, préférence Vibrations | `src/app/(tabs)/profile/index.tsx`, `src/storage/uiPreferences.ts` |
| Connexion | `src/app/(auth)/login.tsx` |
| Accueil admin | `src/app/(admin)/admin-home.tsx` |
| Messages en haut de l'écran (toasts) | `src/app/_layout.tsx`, `src/components/ui/toastConfig.tsx` |
| Boutons qui s'enfoncent + vibration, apparition en cascade | `src/components/ui/PressableScale.tsx`, `src/components/ui/FadeIn.tsx` |
| Décor de Noël (1er déc. – 6 janv.) : bonnet sur la photo, neige sur les cartes, flocons (accueil, profil, discussions, forum), cadeaux (tournoi) | `src/components/christmas/Christmas.tsx` et les écrans qui l’utilisent |
| Choix de l’opérateur en logos ronds, barre d’étapes, montant | `src/app/user_chats/deposit-withdrawal.tsx`, `src/components/depositFlow.tsx` |

Copies prises **après** des changements déjà demandés plus tôt (ils restent si
l'on revient en arrière) : bannières en 3:2 (`home.tsx`, `slide-editor.tsx`),
nouvel écran de dépôt (`deposit-withdrawal.tsx`, qui a son propre retour arrière
dans `src/app/user_chats/RETOUR-ANCIEN-DEPOT.md`), fenêtre de mise à jour masquée
sur le web (`useVersionChech.ts`).

Le module `expo-haptics` (vibrations) a été ajouté au projet ; il peut rester
même après un retour en arrière.
