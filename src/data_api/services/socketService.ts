// src/services/socket.service.ts

import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  

  connect(token: string) {
    if (this.socket?.connected && this.token === token) return;
    if (this.token !== token) {
      this.socket?.disconnect();
      this.socket = null;
    }
    const apiUrl = Constants.expoConfig?.extra?.apiUrl;

    this.socket = io(apiUrl, {
      transports: ['websocket'],
      auth: {
        token,
      },
    });
    this.token = token;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.token = null;
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();