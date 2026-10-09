import React, { useState, useEffect } from 'react';
import type { AppNotification, User } from '../types.ts';
import { fetchNotifications, markNotificationRead } from '../api.ts';
import { AlertTriangle, Bell, Check, X, Wrench, Clock, MapPin } from 'lucide-react';

interface NotificationBannerProps {
  currentUser: User;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ currentUser }) => {
  const [activeAlert, setActiveAlert] = useState<AppNotification | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const checkAlerts = async () => {
    try {
      const notifs = await fetchNotifications();
      // Find the most recent unread urgent reminder or task notification
      const isUnread = (n: AppNotification) =>
        !n.readByUserIds?.includes(currentUser.id) && !dismissedIds.includes(n.id);

      // Prioritize reminders first, then urgent tasks
      const reminder = notifs.find((n) => n.type === 'reminder' && isUnread(n));
      const urgent = notifs.find((n) => n.urgency === 'urgent' && isUnread(n));
      const otherUnread = notifs.find((n) => isUnread(n));

      setActiveAlert(reminder || urgent || otherUnread || null);
    } catch (err) {
      // Quiet fail
    }
  };

  useEffect(() => {
    checkAlerts();
    const timer = setInterval(checkAlerts, 4000);
    return () => clearInterval(timer);
  }, [dismissedIds]);

  if (!activeAlert) return null;

  const handleAcknowledge = async () => {
    try {
      await markNotificationRead(activeAlert.id);
      setDismissedIds((prev) => [...prev, activeAlert.id]);
      setActiveAlert(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = () => {
    setDismissedIds((prev) => [...prev, activeAlert.id]);
    setActiveAlert(null);
  };

  const isReminder = activeAlert.type === 'reminder';

  return (
    <div className="bg-gradient-to-r from-amber-500 via-emerald-600 to-[#087A50] p-0.5 shadow-md">
      <div className="bg-white/95 backdrop-blur-sm px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-1.5 rounded-xl text-white shrink-0 shadow-sm ${
              isReminder ? 'bg-amber-600' : 'bg-[#087A50]'
            }`}
          >
            {isReminder ? (
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isReminder
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-[#E4F2E9] text-[#075B40] border border-[#D2E4D8]'
                }`}
              >
                {isReminder ? '⚠️ URGENT REMINDER' : activeAlert.type.replace('_', ' ').toUpperCase()}
              </span>
              {activeAlert.ticketNumber && (
                <span className="font-mono font-bold text-[#087A50]">
                  {activeAlert.ticketNumber}
                </span>
              )}
              <span className="text-[#697B72] text-[11px]">from {activeAlert.fromName}</span>
            </div>
            <p className="text-[#172A24] font-medium mt-0.5 leading-snug line-clamp-1">
              {activeAlert.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={handleAcknowledge}
            className="px-3 py-1 bg-[#087A50] hover:bg-[#075B40] text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Acknowledge</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-[#697B72] hover:text-[#172A24] hover:bg-slate-100 transition"
            title="Dismiss from banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
