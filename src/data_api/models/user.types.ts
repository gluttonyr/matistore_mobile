/**
 * Rôles utilisateur disponibles
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  VENDEUR = 'VENDEUR',
  AFFILIER = 'AFFILIER',
}

/**
 * Utilisateur renvoyé par le backend
 */
export interface User {
  trackingId: string;
  nom: string;
  prenom: string;
  username: string;
  email: string;
  telephone: string;
  role: UserRole;
  active: boolean;
  googleId?: string | null;
  provider?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token?: string;
  token: string;
  user: User;
}

export interface CreateUserDto {

  nom: string;


  prenom: string;


  username?: string;

  email: string;

  password: string;


  telephone: string;


  role?: string;


  active?: boolean;


  googleId?: string;

  provider?: string;
}

