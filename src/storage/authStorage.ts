import * as SecureStore from 'expo-secure-store';
import { User } from '@/data_api/models/user.types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const authStorage = {
  async getToken() {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async setToken(token: string) {
    return await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async removeToken() {
    console.log("token confirmé le remove")
    return await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  /** Profil mis en cache localement : permet de connaître le rôle de
   * l'utilisateur (et de lui afficher des données) avant même d'avoir
   * contacté le serveur au démarrage de l'app. */
  async getUser(): Promise<User | null> {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },

  async setUser(user: User) {
    return await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async removeUser() {
    return await SecureStore.deleteItemAsync(USER_KEY);
  },
};