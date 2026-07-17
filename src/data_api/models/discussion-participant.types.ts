export interface DiscussionParticipant {
  trackingId: string;
  joinedAt: string;
  isAdmin: boolean;
  discussionTrackingId?: string | null;
  userTrackingId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DiscussionParticipants = DiscussionParticipant[];
