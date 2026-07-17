// src/services/socket.service.ts

import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  

  connect(token: string) {
    if (this.socket?.connected) return;
    const apiUrl = Constants.expoConfig?.extra?.apiUrl;

    this.socket = io(apiUrl, {
      transports: ['websocket'],
      auth: {
        token,
      },
    });
  }

  disconnect() {
    this.socket?.disconnect();
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();