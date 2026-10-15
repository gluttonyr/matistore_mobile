import { useEffect, useRef, useState } from 'react';
import { socketService } from '@/data_api/services/socketService';

export function useClientPresence(discussionId: string) {
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | undefined>();
  const clientUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !discussionId) return;

    socket.emit('getDiscussionClientStatus', discussionId, (res: any) => {
      if (res?.userId) {
        clientUserIdRef.current = res.userId;
        setOnline(res.online);
        setLastSeen(res.lastSeen);
      }
    });

    const handleStatus = (payload: { userId: number; online: boolean; lastSeen?: string }) => {
      if (payload.userId !== clientUserIdRef.current) return; // filtre : ce n'est pas notre client
      setOnline(payload.online);
      setLastSeen(payload.lastSeen);
    };

    socket.on('userStatusChanged', handleStatus);
    return () => {
      socket.off('userStatusChanged', handleStatus);
    };
  }, [discussionId]);

  return { online, lastSeen };
}