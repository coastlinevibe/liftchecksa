'use client';

import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';

type NotificationState = {
  routeAlerts: boolean;
  messages: boolean;
  marketing: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationState = {
  routeAlerts: true,
  messages: true,
  marketing: false,
};

export default function NotificationPreferences({ storageKey }: { storageKey: string }) {
  const [notifications, setNotifications] = useState<NotificationState>(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    const stored = window.localStorage.getItem(`liftcheck.notifications.${storageKey}`);

    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as Partial<NotificationState>;
      const nextState: NotificationState = {
        routeAlerts: parsed.routeAlerts ?? DEFAULT_NOTIFICATIONS.routeAlerts,
        messages: parsed.messages ?? DEFAULT_NOTIFICATIONS.messages,
        marketing: parsed.marketing ?? DEFAULT_NOTIFICATIONS.marketing,
      };

      const timer = window.setTimeout(() => {
        setNotifications(nextState);
      }, 0);

      return () => window.clearTimeout(timer);
    } catch {
      window.localStorage.removeItem(`liftcheck.notifications.${storageKey}`);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(`liftcheck.notifications.${storageKey}`, JSON.stringify(notifications));
  }, [notifications, storageKey]);

  const items = [
    {
      key: 'routeAlerts',
      title: 'Route Alerts',
      description: 'Seat confirmations & updates',
    },
    {
      key: 'messages',
      title: 'Messages',
      description: 'New chat messages',
    },
    {
      key: 'marketing',
      title: 'Marketing',
      description: 'Tips & promotions',
    },
  ] as const;

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const enabled = notifications[item.key];

        return (
          <div key={item.key} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-600" />
              <div>
                <div className="text-sm text-slate-900">{item.title}</div>
                <div className="text-xs text-slate-600">{item.description}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotifications({ ...notifications, [item.key]: !enabled })}
              className={`w-11 h-6 rounded-full transition-all ${
                enabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              aria-pressed={enabled}
              aria-label={item.title}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
