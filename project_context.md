# MatiStore Mobile — contexte du projet

## État actuel

- Application mobile Expo / React Native, version Expo SDK 56.
- Le parcours de dépôt Mobile Money et les actions de paiement sont dans `src/app/user_chats/deposit-withdrawal.tsx`.
- La composition du code USSD Android et le choix de la SIM sont gérés par le module natif `modules/expo-ussd-dialer`.

## Dernières modifications

- Dans `app.config.js`, le package Android est `com.urbain_diligence.matistore_mobile`, cohérent avec l’application native existante.
- La configuration Android déclare `android.permission.CALL_PHONE` et `android.permission.READ_PHONE_STATE`. La seconde est demandée lors du dépôt afin d’accéder aux SIM pour la sélection de la SIM vocale.
- Dans `src/app/user_chats/deposit-withdrawal.tsx`, les boutons **Effectuer le paiement** et **Copier le code et attendre** ne sont plus désactivés simplement parce que le dépôt est en cours de vérification. Ils peuvent ainsi être retentés ou utilisés pour recopier le code.
- Ces deux boutons restent désactivés pendant la création de la transaction et après confirmation du paiement. Un refus d’autorisation ou un échec USSD remet l’état de traitement à zéro afin de permettre une nouvelle tentative.

## Vérifications et points à reprendre

- La configuration Expo résolue a été vérifiée : elle contient le package attendu ainsi que `CALL_PHONE` et `READ_PHONE_STATE`.
- Aucun diagnostic n’a été signalé dans le fichier de l’écran de dépôt après la dernière modification.
- La vérification TypeScript globale échoue actuellement sur plusieurs erreurs dans d’autres fichiers (notamment `modules/expo-notif-capture/index.ts`, les layouts admin/tabs, et plusieurs fichiers `src/`). Ces erreurs n’ont pas été modifiées dans le cadre de ces changements.
- Toute modification des permissions natives doit être incluse dans une nouvelle compilation et installation Android pour prendre effet sur l’appareil.
