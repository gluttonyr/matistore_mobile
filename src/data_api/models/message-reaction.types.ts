export enum TypeEmoji {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  LAUGH = 'LAUGH',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
}

export interface MessageReaction {
  trackingId: string;
  typeEmoji: TypeEmoji | string;
  userTrackingId?: string | null;
  messageTrackingId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageReactions = MessageReaction[];
