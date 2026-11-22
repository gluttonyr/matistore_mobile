export type ReferralPrize = {
  rank: number;
  type: 'MONEY' | 'LOT';
  amount?: number | null;
  label?: string | null;
  /** Filename in the uploads folder "referral". */
  imageUrl?: string | null;
  /** Ready-to-show text: "20 000 FCFA" or the lot's name. */
  labelText?: string;
};

export type ReferralFilleul = {
  trackingId: string;
  name: string;
  image: string | null;
  since: string | null;
  validated: boolean;
};

export type ReferralMe = {
  code: string | null;
  canGetCode: boolean;
  parrain: { name: string; image?: string | null } | null;
  promptSeen: boolean;
  totalFilleuls: number;
  validatedThisRound: number;
  filleuls: ReferralFilleul[];
};

export type ReferralRankingRow = {
  rank: number;
  trackingId: string;
  name: string;
  image: string | null;
  validated: number;
  isMe: boolean;
};

export type ReferralCurrentRound = {
  number: number;
  startAt: string;
  endAt: string;
  winnersCount: number;
  prizes: ReferralPrize[];
  rules: { depositsRequired: number; minAmount: number };
  ranking: ReferralRankingRow[];
  me: { rank: number | null; validated: number; hasCode: boolean; missingForWinners: number };
};

export type ReferralResults = {
  number: number;
  startAt: string;
  endAt: string;
  winners: { rank: number; name: string; image: string | null; validated: number; prize: ReferralPrize | null; isMe: boolean }[];
  myRank: number | null;
  myRewarded: boolean;
};

export type ReferralTournament = {
  active: boolean;
  round: ReferralCurrentRound | null;
  lastResults: ReferralResults | null;
};

export type ReferralSettings = {
  active: boolean;
  durationDays: number;
  winnersCount: number;
  depositsRequired: number;
  minAmount: number;
  prizes: ReferralPrize[];
};

export type ReferralAdminOverview = {
  settings: ReferralSettings;
  currentRound: (Omit<ReferralCurrentRound, 'ranking' | 'me' | 'rules'> & { depositsRequired: number; minAmount: number }) | null;
};

export type ReferralAdminWinner = {
  id: number;
  rank: number;
  name: string;
  image: string | null;
  userTrackingId: string;
  discussionId: string | null;
  validated: number;
  prize: ReferralPrize | null;
  rewarded: boolean;
  rewardedAt: string | null;
};

export type ReferralAdminRound = {
  id: number;
  number: number;
  status: 'ACTIVE' | 'FINISHED' | 'CANCELLED';
  startAt: string;
  endAt: string;
  winners: ReferralAdminWinner[];
  rewardedCount: number;
};

export type ReferralStats = {
  round: { number: number; startAt: string; endAt: string } | null;
  participants?: number;
  validated?: number;
  filleulsJoined?: number;
  depositedAmount?: number;
  daily?: { day: string; validated: number }[];
  top?: { rank: number; name: string; validated: number }[];
};
