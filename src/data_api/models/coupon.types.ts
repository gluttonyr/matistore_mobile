export type CouponStatus = 'EN_COURS' | 'GAGNE' | 'PERDU';

export type CouponCode = {
  bookmaker: string;
  code: string;
  /** Display name and logo filename (uploads folder "bookmakers"); absent in notifications. */
  name?: string;
  logo?: string | null;
  siteUrl?: string | null;
};

export type Coupon = {
  id: string;
  number: number;
  /** Full URL of the screenshot. */
  imageUrl: string;
  odds: string | null;
  note: string | null;
  status: CouponStatus;
  createdAt: string;
  codes: CouponCode[];
};

export type CouponPage = { items: Coupon[]; hasMore: boolean };
