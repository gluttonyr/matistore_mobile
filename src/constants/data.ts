export const mockConversations = [
  {
    id: '1',
    type: 'support',
    name: 'Support MATI STORE',
    lastMessage: "Bonjour, comment puis-je vous aider ?",
    time: '10:30',
    unread: 2,
    avatar: null,
    online: true,
  },
  {
    id: '2',
    type: 'deposit-withdrawal',
    name: 'Dépôt / Retrait',
    lastMessage: 'Votre dépôt de 50.000 FCFA a été validé.',
    time: '09:15',
    unread: 0,
    avatar: null,
    online: true,
  },
  // {
  //   id: '3',
  //   type: 'general',
  //   name: 'Discussions Générales',
  //   lastMessage: 'Super nouvelle pour le tournoi !',
  //   time: 'Hier',
  //   unread: 5,
  //   avatar: null,
  //   online: false,
  // },
  // {
  //   id: '4',
  //   type: 'announcements',
  //   name: 'Annonces',
  //   lastMessage: 'Nouveau bonus de bienvenue disponible !',
  //   time: 'Hier',
  //   unread: 1,
  //   avatar: null,
  //   online: false,
  // },
];

export const mockMessages: Record<string, any[]> = {
  '1': [
    { id: '1', text: "Bonjour ! Bienvenue sur MATI STORE. Comment puis-je vous aider ?", sender: 'other', time: '10:30', read: true },
    { id: '2', text: 'Bonjour, j\'ai une question sur mon dépôt.', sender: 'me', time: '10:31', read: true },
    { id: '3', text: 'Bien sûr ! Quel est le problème avec votre dépôt ?', sender: 'other', time: '10:32', read: true },
  ],
  '2': [
    {
      id: '1',
      type: 'deposit-request',
      operator: 'Flooz',
      amount: '50.000',
      number: '90 12 34 56',
      status: 'validated',
      sender: 'me',
      time: '09:00',
      read: true,
    },
    { id: '2', text: 'Votre dépôt de 50.000 FCFA a été validé avec succès !', sender: 'other', time: '09:15', read: true },
  ],
  '3': [
    { id: '1', text: 'Quelqu\'un a participé au dernier tournoi ?', sender: 'other', senderName: 'Kokou', time: 'Hier', read: true },
    { id: '2', text: 'Oui moi ! J\'ai gagné 25.000 FCFA', sender: 'other', senderName: 'Ama', time: 'Hier', read: true },
    { id: '3', text: 'Super nouvelle pour le tournoi !', sender: 'me', time: 'Hier', read: true },
  ],
  '4': [
    { id: '1', text: 'Nouveau bonus de bienvenue disponible ! Jusqu\'à 100% sur votre premier dépôt.', sender: 'other', senderName: 'Admin', time: 'Hier', read: false },
  ],
};

export const mockEvents = [
  {
    id: '1',
    title: 'Tournoi MATI STORE - Juin 2026',
    description: 'Grand tournoi mensuel avec une cagnotte de 500.000 FCFA à gagner.',
    date: '15 Juin 2026',
    location: 'Lomé, Togo',
    image: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Tournoi',
  },
  {
    id: '2',
    title: 'Promotion Flash 48h',
    description: 'Bonus de 50% sur tous les dépôts pendant 48 heures seulement.',
    date: '05 Juin 2026',
    location: 'En ligne',
    image: 'https://images.pexels.com/photos/6289065/pexels-photo-6289065.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Promotion',
  },
  {
    id: '3',
    title: 'Soirée Communauté MATI',
    description: 'Rejoignez-nous pour une soirée de networking et de divertissement.',
    date: '20 Juin 2026',
    location: 'Cotonou, Bénin',
    image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Événement',
  },
  {
    id: '4',
    title: 'Webinaire : Stratégies Gagnantes',
    description: 'Apprenez les meilleures stratégies avec nos experts MATI STORE.',
    date: '25 Juin 2026',
    location: 'En ligne',
    image: 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Formation',
  },
];

export const mockForumCategories = [
  { id: '1', name: 'Général', icon: 'MessageSquare', topics: 142, locked: false, description: 'Discussions générales sur MATI STORE' },
  { id: '2', name: 'Support', icon: 'HelpCircle', topics: 89, locked: false, description: 'Aide et assistance technique' },
  { id: '3', name: 'Discussions', icon: 'Users', topics: 215, locked: false, description: 'Échanges entre membres' },
  { id: '4', name: 'Actualités', icon: 'Newspaper', topics: 34, locked: true, description: 'Annonces et actualités officielles' },
];

export const mockForumTopics = [
  {
    id: '1',
    categoryId: '1',
    title: 'Comment fonctionne le système de bonus ?',
    author: 'Kokou_Togo',
    date: '2 Juin 2026',
    replies: 12,
    views: 234,
    pinned: true,
    content: 'Bonjour à tous, je voudrais comprendre comment fonctionne le système de bonus sur MATI STORE...',
  },
  {
    id: '2',
    categoryId: '1',
    title: 'Partage ton expérience avec MATI STORE',
    author: 'Ama_Accra',
    date: '1 Juin 2026',
    replies: 28,
    views: 567,
    pinned: false,
    content: 'Depuis que j\'utilise MATI STORE, j\'ai eu une expérience formidable...',
  },
  {
    id: '3',
    categoryId: '2',
    title: 'Délai de traitement des retraits',
    author: 'Momo_Dakar',
    date: '31 Mai 2026',
    replies: 5,
    views: 98,
    pinned: false,
    content: 'Bonjour, quel est le délai habituel pour les retraits via Flooz ?',
  },
];

export const mockHeroSlides = [
  {
    id: '1',
    title: 'BONUS 100%',
    subtitle: 'Jusqu\'à 50.000 FCFA sur votre premier dépôt',
    cta: 'Profiter maintenant',
    image: 'https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: '2',
    title: 'TOURNOI JUIN',
    subtitle: 'Gagnez jusqu\'à 500.000 FCFA',
    cta: 'Participer',
    image: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: '3',
    title: 'RETRAITS RAPIDES',
    subtitle: 'Votre argent en quelques minutes',
    cta: 'Découvrir',
    image: 'https://images.pexels.com/photos/6289065/pexels-photo-6289065.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

export const mockNews = [
  {
    id: '1',
    title: 'Nouveau bonus de bienvenue',
    description: 'MATI STORE lance son nouveau programme de bienvenue avec 100% de bonus.',
    date: '1 Juin 2026',
    category: 'Bonus',
  },
  {
    id: '2',
    title: 'Nouveau partenaire mobile money',
    description: 'Moov Money rejoint notre liste d\'opérateurs disponibles pour les transactions.',
    date: '30 Mai 2026',
    category: 'Annonce',
  },
  {
    id: '3',
    title: 'Mise à jour de la plateforme',
    description: 'Améliorations de la vitesse et nouvelles fonctionnalités disponibles.',
    date: '28 Mai 2026',
    category: 'Mise à jour',
  },
];
