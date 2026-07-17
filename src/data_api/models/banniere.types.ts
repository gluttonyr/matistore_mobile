export interface Banniere {
  trackingId: string;
  titre: string;
  sousTitre?: string | null;
  image?: string | null;
  texteCta?: string | null;
  lien?: string | null;
  ordre: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBanniereDto {
  titre: string;
  sousTitre?: string;
  image?: string;
  texteCta?: string;
  lien?: string;
  ordre?: number;
}

export interface UpdateBanniereDto {
  titre?: string;
  sousTitre?: string;
  image?: string;
  texteCta?: string;
  lien?: string;
  ordre?: number;
}
