import { DiscussionParticipant } from "./discussion-participant.types";

export interface Discussion {
  trackingId: string;
  titre: string;
  type: DiscussionType;
  statut: DiscussionStatus;
  participants: DiscussionParticipant[];
  image?: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
  lastMessageContent?: string | null;
  username?: string | null;
  userProfile?: {
    trackingId: string;
    nom: string;
    prenom: string;
    username: string;
    email: string;
    telephone?: string | null;
    image?: string | null;
    active: boolean;
    createdAt: string;
  };
  unreadCount?: number;
  /** false = discussion verrouillée (ex: forum verrouillé, lecture seule pour les non-admins). */
  active: boolean;
}

export enum DiscussionType {
  DEPOT_RETRAIT = 'depot_retrait',
  SUPPORT = 'support',
  FORUM = 'forum'
}

 export enum DiscussionStatus {
   DEPOT = 'depot',
   RETRAIT = 'retrait',
    AUTRE = 'autre',
 }

export type Discussions = Discussion[];

export type AdminDiscussionCategory = 'all' | 'unread' | 'depot' | 'retrait' | 'support';

export interface AdminDiscussionPage {
  items: Discussion[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  counts: Record<AdminDiscussionCategory, number>;
}
