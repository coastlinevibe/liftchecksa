'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type RouteChatMessage = {
  id: string;
  route_id?: string;
  assignment_id?: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at?: string | null;
};

type RouteChatThreadProps = {
  routeId: string;
  assignmentId: string;
  currentProfileId: string;
  peerProfileId?: string | null;
  initialMessages: RouteChatMessage[];
  emptyStateText: string;
};

export default function RouteChatThread({
  routeId,
  assignmentId,
  currentProfileId,
  peerProfileId,
  initialMessages,
  emptyStateText,
}: RouteChatThreadProps) {
  const supabase = useMemo(() => createClient(), []);
  const initialResolvedPeerProfileId = useMemo(() => {
    if (peerProfileId) return peerProfileId;

    const inferred = initialMessages.find(
      (message) => message.sender_id !== currentProfileId && message.sender_id
    );
    if (inferred?.sender_id) {
      return inferred.sender_id;
    }

    const fallback = initialMessages.find(
      (message) => message.receiver_id !== currentProfileId && message.receiver_id
    );
    return fallback?.receiver_id || null;
  }, [currentProfileId, initialMessages, peerProfileId]);

  const [messages, setMessages] = useState<RouteChatMessage[]>(() => initialMessages);
  const [resolvedPeerProfileId, setResolvedPeerProfileId] = useState<string | null>(
    () => initialResolvedPeerProfileId
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setResolvedPeerProfileId(initialResolvedPeerProfileId);
  }, [initialResolvedPeerProfileId]);

  useEffect(() => {
    if (!routeId || !assignmentId || !currentProfileId) return;

    let cancelled = false;

    const syncMessages = async () => {
      const { data } = await supabase
        .from('route_chats')
        .select('id, route_id, assignment_id, sender_id, receiver_id, message, created_at')
        .eq('route_id', routeId)
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: true });

      if (cancelled || !data) return;

      setMessages((currentMessages) => {
        const merged = new Map<string, RouteChatMessage>();

        for (const message of currentMessages) {
          merged.set(message.id, message);
        }

        for (const message of data as RouteChatMessage[]) {
          merged.set(message.id, message);
        }

        return Array.from(merged.values()).sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          return aTime - bTime;
        });
      });

      if (!resolvedPeerProfileId) {
        const inferredPeer =
          (data as RouteChatMessage[]).find((message) => message.sender_id !== currentProfileId)?.sender_id ||
          (data as RouteChatMessage[]).find((message) => message.receiver_id !== currentProfileId)?.receiver_id ||
          null;

        if (inferredPeer) {
          setResolvedPeerProfileId(inferredPeer);
        }
      }
    };

    void syncMessages();
    const intervalId = window.setInterval(() => {
      void syncMessages();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [assignmentId, currentProfileId, routeId, resolvedPeerProfileId, supabase]);

  useEffect(() => {
    if (!routeId || !assignmentId || !currentProfileId) return;

    const channel = supabase
      .channel(`route-chat:${routeId}:${assignmentId}:${currentProfileId}:${resolvedPeerProfileId || 'any'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'route_chats',
          filter: `assignment_id=eq.${assignmentId}`,
        },
        (payload) => {
          const nextMessage = payload.new as RouteChatMessage;
          const threadPeerId = resolvedPeerProfileId;
          const relatesToThread = threadPeerId
            ? (
                (nextMessage.sender_id === currentProfileId && nextMessage.receiver_id === threadPeerId) ||
                (nextMessage.sender_id === threadPeerId && nextMessage.receiver_id === currentProfileId)
              )
            : nextMessage.route_id === routeId &&
              nextMessage.assignment_id === assignmentId &&
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
  }, [assignmentId, currentProfileId, resolvedPeerProfileId, routeId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  return (
    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
      {messages.length > 0 ? (
        messages.map((chat) => {
          const isMine = chat.sender_id === currentProfileId;

          return (
            <div key={chat.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  isMine
                    ? 'rounded-br-md bg-emerald-500 text-white'
                    : 'rounded-bl-md bg-slate-100 text-slate-900'
                }`}
              >
                {chat.message}
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {emptyStateText}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
