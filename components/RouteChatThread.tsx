'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OpenRouteChatMessage, OpenRouteChatParticipant } from '@/lib/types/route-chat';

type RouteChatThreadProps = {
  threadId: string;
  currentProfileId: string;
  initialMessages: OpenRouteChatMessage[];
  participants?: OpenRouteChatParticipant[];
  emptyStateText: string;
};

function getInitials(value?: string | null) {
  const parts = (value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export default function RouteChatThread({
  threadId,
  currentProfileId,
  initialMessages,
  participants = [],
  emptyStateText,
}: RouteChatThreadProps) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<OpenRouteChatMessage[]>(() => initialMessages);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!threadId || !currentProfileId) return;

    let cancelled = false;

    const syncMessages = async () => {
      const { data } = await supabase
        .from('route_chat_messages')
        .select('id, thread_id, sender_id, message, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (cancelled || !data) return;

      setMessages((currentMessages) => {
        const merged = new Map<string, OpenRouteChatMessage>();

        for (const message of currentMessages) {
          merged.set(message.id, message);
        }

        for (const message of data as OpenRouteChatMessage[]) {
          merged.set(message.id, message);
        }

        return Array.from(merged.values()).sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          return aTime - bTime;
        });
      });
    };

    void syncMessages();
    const intervalId = window.setInterval(() => {
      void syncMessages();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentProfileId, supabase, threadId]);

  useEffect(() => {
    if (!threadId || !currentProfileId) return;

    const channel = supabase
      .channel(`route-chat-thread:${threadId}:${currentProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'route_chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const nextMessage = payload.new as OpenRouteChatMessage;
          setMessages((currentMessages) => {
            if (currentMessages.some((message) => message.id === nextMessage.id)) {
              return currentMessages;
            }

            return [...currentMessages, nextMessage].sort((a, b) => {
              const aTime = new Date(a.created_at || 0).getTime();
              const bTime = new Date(b.created_at || 0).getTime();
              return aTime - bTime;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId, supabase, threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  return (
    <div className="space-y-3">
      {participants.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Joined members
          </div>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => {
              const initials = getInitials(participant.display_name);

              return (
                <div
                  key={participant.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  {participant.profile_photo_url ? (
                    <img
                      src={participant.profile_photo_url}
                      alt={participant.display_name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">
                      {initials}
                    </span>
                  )}
                  <span className="font-medium">{participant.display_name}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {messages.length > 0 ? (
          messages.map((chat) => {
            const isMine = chat.sender_id === currentProfileId;

            return (
              <div key={chat.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`flex max-w-[85%] items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                    {chat.sender_photo_url ? (
                      <img
                        src={chat.sender_photo_url}
                        alt={chat.sender_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(chat.sender_name)}</span>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? 'rounded-br-md bg-emerald-500 text-white'
                        : 'rounded-bl-md bg-slate-100 text-slate-900'
                    }`}
                  >
                    {!isMine ? <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{chat.sender_name}</div> : null}
                    <div>{chat.message}</div>
                  </div>
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
    </div>
  );
}

