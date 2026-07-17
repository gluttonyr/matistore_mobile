import api from "@/data_api/lib/api";
import Constants from "expo-constants";

// hooks/useFileUrl.ts
const apiUrl = Constants.expoConfig?.extra?.apiUrl;

/**
 * Retourne l'URL complète d'un fichier stocké sur le backend.
 * Ex: useFileUrl('messages', 'img_123.jpg') 
 *   → 'http://monserveur/uploads/messages/img_123.jpg'
 *
 * Accepte aussi une URL déjà complète (http...) — la retourne telle quelle.
 */
export function useFileUrl(folder: string, filename: string | null | undefined): string {
  if (!filename) return '';
  if (filename.startsWith('http')) return filename;

  // Nettoie les slashes en trop
  const cleanFolder = folder.replace(/^\/|\/$/g, '');
  const cleanFile = filename.replace(/^\//, '');

  return `${apiUrl}/uploads/${cleanFolder}/${cleanFile}`;
}

/**
 * Version utilitaire (sans React) pour les endroits où un hook n'est pas utilisable.
 */
export function resolveFileUrl(folder: string, filename: string | null | undefined): string {
  if (!filename) return '';
  if (filename.startsWith('http')) return filename;

  const cleanFolder = folder.replace(/^\/|\/$/g, '');
  const cleanFile = filename.replace(/^\//, '');

  return `${apiUrl}/uploads/${cleanFolder}/${cleanFile}`;
}

/**
 * Version qui parse automatiquement un chemin complet "folder/filename"
 * retourné directement par le backend.
 * Ex: resolveRawPath('messages/img_123.jpg')
 *   → 'http://monserveur/uploads/messages/img_123.jpg'
 */
export function resolveRawPath(raw: string | null | undefined): string {
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  const clean = raw.startsWith('/') ? raw.slice(1) : raw;
  return `${api}/uploads/${clean}`;
}