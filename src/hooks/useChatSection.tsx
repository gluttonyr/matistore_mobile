import { ChatSection, groupMessagesByDay } from '@/components/chatGrouping';
import { useMemo } from 'react';


export function useChatSections(messages: any[]): ChatSection[] {
  return useMemo(() => groupMessagesByDay(messages), [messages]);
}
