export interface AppNotification {
  trackingId: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
}

export interface AppNotificationPage {
  items: AppNotification[];
  hasMore: boolean;
  nextCursor: number | null;
}
