export interface AppNotification {
  trackingId: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  /** e.g. "coupon:<id>". */
  link?: string | null;
  /** Present on coupon notifications. */
  coupon?: import('./coupon.types').Coupon | null;
  createdAt: string;
}

export interface AppNotificationPage {
  items: AppNotification[];
  hasMore: boolean;
  nextCursor: number | null;
}
