import React, { useState, useEffect, useRef } from 'react';
import type { AppNotification, User } from '../types.ts';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../api.ts';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Wrench,
  UserCheck,
  X,
  Check,
  Trash2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface NotificationCenterProps {
  currentUser: User;
  onSelectWorkTicket?: (ticketNumber: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  currentUser,
  onSelectWorkTicket,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      // Quiet fail during background poll
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 4000); // 4-second poll for instant cross-window sync
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isReadByMe = (n: AppNotification) => {
    return Array.isArray(n.readByUserIds) && n.readByUserIds.includes(currentUser.id);
  };

  const unreadCount = notifications.filter((n) => !isReadByMe(n)).length;
  const urgentCount = notifications.filter((n) => n.urgency === 'urgent' && !isReadByMe(n)).length;

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readByUserIds: [...(n.readByUserIds || []), currentUser.id] } : n
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readByUserIds: Array.from(new Set([...(n.readByUserIds || []), currentUser.id])),
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !isReadByMe(n);
    if (filter === 'urgent') return n.urgency === 'urgent';
    return true;
  });

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'reminder':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'work_assigned':
        return <Clock className="w-4 h-4 text-[#087A50]" />;
      case 'work_reached':
        return <MapPin className="w-4 h-4 text-sky-500" />;
      case 'work_postponed':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'tools_required':
        return <Wrench className="w-4 h-4 text-purple-500" />;
      case 'guest_worker_assigned':
        return <UserCheck className="w-4 h-4 text-indigo-500" />;
      case 'work_done':
        return <CheckCircle2 className="w-4 h-4 text-[#229B68]" />;
      default:
        return <Bell className="w-4 h-4 text-[#087A50]" />;
    }
  };

  const getNotificationBadgeClass = (type: AppNotification['type']) => {
    switch (type) {
      case 'reminder':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'work_assigned':
        return 'bg-[#E4F2E9] text-[#075B40] border-[#D2E4D8]';
      case 'work_reached':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'work_postponed':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'tools_required':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'guest_worker_assigned':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'work_done':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  // Top banner for the most recent unread urgent reminder
  const latestUrgentReminder = notifications.find(
    (n) => n.type === 'reminder' && !isReadByMe(n)
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BELL TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
          isOpen
            ? 'bg-[#E4F2E9] text-[#087A50] shadow-[inset_0_2px_4px_rgba(8,122,80,0.1)]'
            : 'bg-white hover:bg-[#F8FAF9] text-[#172A24] border border-[#DCE8E0] shadow-[0_2px_6px_rgba(29,67,48,0.06)]'
        }`}
        title="In-App Notification Center"
        aria-label="In-App Notifications"
      >
        <Bell className="w-4 h-4 text-[#087A50]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#D94F52] text-white text-[11px] font-bold flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* CLAYMORPHISM NOTIFICATION DROPDOWN / DRAWER */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[92vw] bg-white border border-[#DCE8E0] rounded-2xl shadow-[0_12px_36px_rgba(29,67,48,0.14),0_4px_12px_rgba(29,67,48,0.06)] z-50 overflow-hidden flex flex-col max-h-[80vh] transition-all duration-200 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#E4F2E9] to-white border-b border-[#DCE8E0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#087A50] text-white flex items-center justify-center shadow-[0_3px_8px_rgba(8,122,80,0.3)]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172A24]">In-App Notifications</h3>
                <p className="text-[11px] text-[#697B72]">
                  {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread on your window`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 text-[11px] font-semibold text-[#087A50] hover:text-[#075B40] hover:bg-[#E4F2E9]/60 rounded-lg transition"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[#697B72] hover:text-[#172A24] hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 py-2 bg-[#F8FAF9] border-b border-[#DCE8E0] flex items-center gap-2 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-[#087A50] text-white shadow-sm'
                  : 'text-[#697B72] hover:text-[#172A24]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filter === 'unread'
                  ? 'bg-[#087A50] text-white shadow-sm'
                  : 'text-[#697B72] hover:text-[#172A24]'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filter === 'urgent'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-[#697B72] hover:text-[#172A24]'
              }`}
            >
              Urgent ({urgentCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EBF2ED] p-2 space-y-1">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#E4F2E9] text-[#087A50] mx-auto flex items-center justify-center mb-2.5 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[#172A24]">No notifications</p>
                <p className="text-xs text-[#697B72] mt-0.5">
                  You are completely up to date.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const read = isReadByMe(n);
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!read) handleMarkRead(n.id);
                    }}
                    className={`p-3 rounded-xl transition cursor-pointer relative group ${
                      read
                        ? 'bg-white hover:bg-[#F8FAF9]'
                        : 'bg-[#F2F8F4] border border-[#D2E4D8]/70 hover:bg-[#EBF5EF]'
                    }`}
                  >
                    {!read && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#087A50]" />
                    )}

                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-white border border-[#DCE8E0] shadow-sm shrink-0">
                        {getNotificationIcon(n.type)}
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getNotificationBadgeClass(
                              n.type
                            )}`}
                          >
                            {n.type.replace('_', ' ').toUpperCase()}
                          </span>
                          {n.ticketNumber && (
                            <span className="text-[11px] font-mono font-bold text-[#087A50]">
                              {n.ticketNumber}
                            </span>
                          )}
                          <span className="text-[10px] text-[#697B72] ml-auto">
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-[#172A24] mt-1 line-clamp-1">
                          {n.title}
                        </h4>

                        <p className="text-xs text-[#40544C] mt-0.5 leading-relaxed">
                          {n.message}
                        </p>

                        {/* Metadata pills */}
                        {n.metadata && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {n.metadata.campusLocation && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#DCE8E0] text-[10px] text-[#697B72]">
                                <MapPin className="w-2.5 h-2.5 text-[#087A50]" />
                                {n.metadata.campusLocation}
                              </span>
                            )}
                            {n.metadata.neededTools && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-[10px] font-semibold text-purple-700">
                                <Wrench className="w-2.5 h-2.5" />
                                {n.metadata.neededTools}
                              </span>
                            )}
                            {n.metadata.cause && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
                                Cause: {n.metadata.cause}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#DCE8E0]/40 text-[10px] text-[#697B72]">
                          <span>From: {n.fromName}</span>
                          <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition">
                            {!read ? (
                              <button
                                onClick={(e) => handleMarkRead(n.id, e)}
                                className="text-[#087A50] hover:underline font-semibold flex items-center gap-0.5"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark read</span>
                              </button>
                            ) : null}
                            <button
                              onClick={(e) => handleDelete(n.id, e)}
                              className="text-red-500 hover:text-red-700 p-0.5"
                              title="Dismiss"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-[#F8FAF9] border-t border-[#DCE8E0] text-center text-[11px] text-[#697B72]">
            UPDHITE Real-Time Notification System • All alerts synchronized
          </div>
        </div>
      )}
    </div>
  );
};
