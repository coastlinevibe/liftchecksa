'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type TripChatMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at?: string | null;
};

type TripChatThreadProps = {
  tripId: string;
  currentProfileId: string;
  peerProfileId: string;
  initialMessages: TripChatMessage[];
  emptyStateText: string;
};

export default function TripChatThread({
  tripId,
  currentProfileId,
  peerProfileId,
  initialMessages,
  emptyStateText,
}: TripChatThreadProps) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<TripChatMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!tripId || !currentProfileId || !peerProfileId) return;

    const channel = supabase
      .channel(`trip-chat:${tripId}:${currentProfileId}:${peerProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_chats',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const nextMessage = payload.new as TripChatMessage;
          const relatesToThread =
            (nextMessage.sender_id === currentProfileId && nextMessage.receiver_id === peerProfileId) ||
            (nextMessage.sender_id === peerProfileId && nextMessage.receiver_id === currentProfileId);

          if (!relatesToThread) return;

          setMessages((currentMessages) => {
            if (currentMessages.some((message) => message.id === nextMessage.id)) {
              return currentMessages;
            }

            return [...currentMessages, nextMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId, peerProfileId, supabase, tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
      {messages.length > 0 ? (
        messages.map((chat) => {
          const isMine = chat.sender_id === currentProfileId;

          return (
            <div key={chat.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  isMine
                    ? 'bg-emerald-500 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-900 rounded-bl-md'
                }`}
              >
                {chat.message}
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
          {emptyStateText}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
