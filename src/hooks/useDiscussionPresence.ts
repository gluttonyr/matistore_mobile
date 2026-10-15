import { useEffect, useState } from 'react';
import { socketService } from '@/data_api/services/socketService';

export function useDiscussionPresence(discussionId: string) {
  const [adminPresent, setAdminPresent] = useState(false);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !discussionId) return;

    socket.emit('getDiscussionPresence', discussionId, (res: { adminPresent: boolean }) => {
      if (res) setAdminPresent(res.adminPresent);
    });

    const handlePresence = (payload: { discussionId: string; adminPresent: boolean }) => {
      if (payload.discussionId !== discussionId) return;
      setAdminPresent(payload.adminPresent);
    };

    socket.on('discussionPresenceChanged', handlePresence);
    return () => {
      socket.off('discussionPresenceChanged', handlePresence);
    };
  }, [discussionId]);

  return adminPresent;
}