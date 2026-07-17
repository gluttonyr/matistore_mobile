export interface Evenement {
  trackingId: string;
  titre: string;
  description: string;
  coverImage?: string | null;
  dateDebut: string;
  dateFin: string;
  lieu?: string | null;
  userId?: string | null;
  categorieId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvenementDto {
  titre: string;
  description: string;
  coverImage?: string;
  dateDebut: string;
  dateFin: string;
  lieu?: string;
  userId?: string;
  categorieTrackingId: string;
}

export interface UpdateEvenementDto {
  titre?: string;
  description?: string;
  coverImage?: string;
  dateDebut?: string;
  dateFin?: string;
  lieu?: string;
  userId?: string;
  categorieTrackingId?: string;
}

export type Evenements = Evenement[];
