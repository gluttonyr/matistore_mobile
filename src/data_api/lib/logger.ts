/**
 * Service de logging sanitisé - évite de logger les données sensibles
 * N'utilise JAMAIS console.error/log directement
 */

const isDevelopment = process.env.NODE_ENV === 'development';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Log une erreur sans données sensibles
 * En dev: affiche plus de détails; En prod: minimal
 */
export const logError = (message: string, context?: LogContext) => {
  const timestamp = new Date().toISOString();
  
  if (isDevelopment) {
    console.error(`[${timestamp}] ERROR: ${message}`, context);
  } else {
    // En prod: logger sans détails sensibles
    console.error(`[${timestamp}] ERROR: ${message}`);
  }
};

export const logWarning = (message: string, context?: LogContext) => {
  const timestamp = new Date().toISOString();
  
  if (isDevelopment) {
    console.warn(`[${timestamp}] WARN: ${message}`, context);
  }
};

export const logInfo = (message: string) => {
  if (isDevelopment) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`);
  }
};

export const logDebug = (message: string, data?: unknown) => {
  if (isDevelopment) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DEBUG: ${message}`, data);
  }
};

/**
 * Extrait les détails d'erreur API sans donner d'infos sensibles
 */
export const getApiErrorMessage = (error: unknown): string => {
  const apiError = error as Record<string, unknown>;
  const response = apiError?.response as Record<string, unknown>;
  const status = response?.status as number | undefined;

  if (!response) {
    // Pas de réponse du tout (hors-ligne, serveur injoignable, timeout) : à
    // distinguer d'une vraie erreur applicative (celles-ci ont un `status`).
    return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
  }
  if (status === 401) {
    return 'Authentification requise';
  }
  if (status === 403) {
    return 'Accès non autorisé';
  }
  if (status === 404) {
    return 'Ressource introuvable';
  }
  if (status === 429) {
    return 'Trop de tentatives. Réessayez plus tard.';
  }
  if (status && status >= 500) {
    return 'Erreur serveur. Veuillez réessayer plus tard.';
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
};
