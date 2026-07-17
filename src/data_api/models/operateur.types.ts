export interface Operateur {
  trackingId: string;
  nom: string;
  /** Ex: "*155*2*2*{numero}*{numero}*{montant}#" — {numero}/{montant} remplacés à l'usage. */
  formatUssd: string;
  imageUrl?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOperateurDto {
  nom: string;
  formatUssd: string;
  imageUrl?: string;
  active?: boolean;
}

export interface UpdateOperateurDto {
  nom?: string;
  formatUssd?: string;
  imageUrl?: string;
  active?: boolean;
}
