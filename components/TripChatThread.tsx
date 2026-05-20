'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type TripChatMessage = {
  id: string;
  trip_id?: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at?: string | null;
};

type TripChatThreadProps = {
  tripId: string;
  currentProfileId: string;
  peerProfileId?: string | null;
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
  const [resolvedPeerProfileId, setResolvedPeerProfileId] = useState<string | null>(peerProfileId || null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setResolvedPeerProfileId(peerProfileId || null);
  }, [peerProfileId]);

  useEffect(() => {
    if (resolvedPeerProfileId || !currentProfileId) return;

    const inferred = initialMessages.find(
      (message) => message.sender_id !== currentProfileId && message.sender_id
    );
    if (inferred?.sender_id) {
      setResolvedPeerProfileId(inferred.sender_id);
      return;
    }

    const fallback = initialMessages.find(
      (message) => message.receiver_id !== currentProfileId && message.receiver_id
    );
    if (fallback?.receiver_id) {
      setResolvedPeerProfileId(fallback.receiver_id);
    }
  }, [currentProfileId, initialMessages, resolvedPeerProfileId]);

  useEffect(() => {
    if (!tripId || !currentProfileId) return;

    const channel = supabase
      .channel(`trip-chat:${tripId}:${currentProfileId}:${resolvedPeerProfileId || 'any'}`)
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
          const threadPeerId = resolvedPeerProfileId;
          const relatesToThread = threadPeerId
            ? (
                (nextMessage.sender_id === currentProfileId && nextMessage.receiver_id === threadPeerId) ||
                (nextMessage.sender_id === threadPeerId && nextMessage.receiver_id === currentProfileId)
              )
            : nextMessage.trip_id === tripId &&
              (nextMessage.sender_id === currentProfileId || nextMessage.receiver_id === currentProfileId);

          if (!relatesToThread) return;

          if (!threadPeerId) {
            const otherParticipant =
              nextMessage.sender_id === currentProfileId ? nextMessage.receiver_id : nextMessage.sender_id;
            if (otherParticipant && otherParticipant !== currentProfileId) {
              setResolvedPeerProfileId(otherParticipant);
            }
          }

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
  }, [currentProfileId, resolvedPeerProfileId, supabase, tripId]);

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
