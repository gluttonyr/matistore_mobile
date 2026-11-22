/** A betting site from GET /bookmakers. Everything here comes from the server: no app update to add or enable one. */
export interface Bookmaker {
  /** Sent with the account check and the transaction, e.g. "1XBET", "MELBET". */
  code: string;
  nom: string;
  /** File in uploads/bookmakers, or a full URL. */
  imageUrl?: string | null;
  /** Opened by "Ouvrir <nom>" when none of the app links works. */
  siteUrl?: string | null;
  /** Links tried first to open the bookmaker's app. */
  appSchemes?: string[];
  /** Inactive: shown greyed out, cannot be chosen. */
  active: boolean;
}

/** Transactions and saved inputs from before the bookmaker choice are 1XBET ones. */
export const DEFAULT_BOOKMAKER = '1XBET';
