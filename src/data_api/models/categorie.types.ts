export interface Categorie {
  trackingId: string;
  libelle: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategorieDto {
  libelle: string;
  description?: string;
}

export interface UpdateCategorieDto {
  libelle?: string;
  description?: string;
}
