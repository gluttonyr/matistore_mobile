export interface Operateur {
  trackingId: string;
  nom: string;
  /** Ex: "*155*2*2*{numero}*{numero}*{montant}#" — {numero}/{montant} remplacés à l'usage. */
  formatUssd: string;
  /** Gabarit USSD de paiement client, avec {numero} et {montant}. */
  formatRetraitUssd?: string | null;
  notification_name?: string | null;
  notificationTitleAdmin?: string | null;
  notificationPackageAdmin?: string | null;
  notificationPatternAdmin?: string | null;
  imageUrl?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOperateurDto {
  nom: string;
  formatUssd: string;
  formatRetraitUssd?: string;
  notification_name?: string;
  notificationTitleAdmin?: string;
  notificationPackageAdmin?: string;
  notificationPatternAdmin?: string;
  imageUrl?: string;
  active?: boolean;
}

export interface UpdateOperateurDto {
  nom?: string;
  formatUssd?: string;
  formatRetraitUssd?: string;
  notification_name?: string;
  notificationTitleAdmin?: string;
  notificationPackageAdmin?: string;
  notificationPatternAdmin?: string;
  imageUrl?: string;
  active?: boolean;
}
