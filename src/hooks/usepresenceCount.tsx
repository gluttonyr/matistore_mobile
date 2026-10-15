// hooks/usePresenceCount.ts
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { socketService } from '@/data_api/services/socketService';

export function usePresenceCount() {
  const { token } = useAuth();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    socketService.connect(token);
    const socket = socketService.getSocket();
    if (!socket) return;

    // État initial : on dérive le count de la liste des users en ligne
    socket.emit('getOnlineUsers', (res: { onlineUserIds: number[] }) => {
      setOnlineCount(res?.onlineUserIds?.length ?? 0);
    });

    const handleCountChanged = ({ count }: { count: number }) => {
      setOnlineCount(count);
    };

    socket.on('onlineCountChanged', handleCountChanged);
    return () => {
      socket.off('onlineCountChanged', handleCountChanged);
    };
  }, [token]);

  return onlineCount;
}