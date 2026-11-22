# Revenir à l'ancien écran de dépôt et de retrait

La refonte de l'écran de dépôt et de retrait (étape D, 21/11/2026) peut être annulée à tout moment. L'ancien design est toujours dans le code, intact.

## Ce que la refonte a changé

Tout se passe dans `deposit-withdrawal.tsx` (ce dossier) :

- une barre d'étapes avec des pastilles (✓ pour les étapes faites) ;
- un résumé sous la barre (bookmaker, opérateur, ID) : on le touche pour revenir modifier ;
- le montant et le numéro sur le même écran, avec le bouton « Payer 5 000 FCFA » qui lance le paiement tout de suite ;
- le suivi en direct du dépôt : Code lancé → Paiement reçu → Crédit en cours → Compte crédité, avec l'heure de chaque étape ;
- au bout de 5 minutes sans paiement, un encadré « Le paiement tarde ? » qui mène aux transactions ;
- un écran « Compte crédité », avec une coche animée, le récapitulatif et les boutons « Ouvrir 1xBet » et « Refaire un dépôt », à la place de la fenêtre « Dépôt crédité » ;
- le retrait sur le même modèle, avec un suivi en direct à la place de la fenêtre « Débit confirmé » ;
- des animations légères : glissement entre les étapes, carte « Joueur trouvé ».

Le serveur n'a pas été modifié. Les autorisations téléphone demandées à la connexion (étape A) et la carte « Dépôt rapide » de l'accueil (étape C) ne font pas partie de cette refonte : elles restent quelle que soit la solution choisie ci-dessous.

## Solution 1 : l'interrupteur (la plus simple, conseillée)

1. Ouvrir `src/constants/featureFlags.ts`.
2. Remplacer `export const DEPOSIT_DESIGN_V2 = true;` par `export const DEPOSIT_DESIGN_V2 = false;`.
3. Refaire l'APK ou la version Play Store, et redéployer le site web.

L'écran redevient exactement celui d'avant la refonte. Pour remettre le nouveau design, remettre `true`.

## Solution 2 : remettre l'ancien fichier tel quel

Une copie complète de l'écran, prise juste avant la refonte, est dans `sauvegarde-avant-refonte/deposit-withdrawal.tsx.txt`.

1. Copier ce fichier à la place de `deposit-withdrawal.tsx` et le renommer `deposit-withdrawal.tsx`.
2. Facultatif : supprimer `src/components/depositFlow.tsx` et `src/constants/featureFlags.ts`, qui ne servent plus.
3. Refaire l'APK ou la version Play Store, et redéployer le site web.

## Solution 3 : avec Git, une fois la refonte commitée

`git revert <commit de la refonte>` annule seulement la refonte.

## Important

Ce changement est dans l'application, pas sur le serveur. Les clients ne voient l'ancien ou le nouveau design qu'après avoir installé la nouvelle version (APK ou Play Store). Le site web change dès qu'il est redéployé.
