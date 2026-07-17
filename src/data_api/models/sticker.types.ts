export interface Sticker {
  trackingId: string;
  libelle: string;
  code: string;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStickerDto {
  libelle: string;
  code: string;
  image?: string;
}

export interface UpdateStickerDto {
  libelle?: string;
  code?: string;
  image?: string;
}
