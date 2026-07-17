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
