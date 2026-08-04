import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, XCircle, RefreshCw, Pencil, CheckCircle2, X } from 'lucide-react';

// Color coding + icon per notification type, per the module spec.
const TYPE_STYLES = {
  booking_created: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Calendar },
  booking_confirmed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  booking_cancelled: { color: 'text-rose-400', bg: 'bg-rose-500/10', icon: XCircle },
  booking_rescheduled: { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: RefreshCw },
  booking_updated: { color: 'text-primary', bg: 'bg-primary/10', icon: Pencil }
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Bell icon + unread badge + dropdown preview.
 *
 * Notifications are fetched by the parent (ClientPortalDashboard) so the
 * unread badge count and the "Notifications" page stay in sync from a
 * single source of truth — this component is presentation + the dropdown
 * interaction only.
 */
const NotificationBell = ({ notifications, onMarkAsRead, onMarkAllAsRead, onGoToPage }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const preview = notifications.slice(0, 6);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-textMuted hover:text-textMain hover:bg-surface transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] bg-surface border border-borderSubtle rounded-3xl shadow-2xl overflow-hidden z-50"
          >
            <div className="px-5 py-4 border-b border-borderSubtle flex items-center justify-between">
              <h3 className="text-xs font-black text-textMain uppercase tracking-widest">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={onMarkAllAsRead} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {preview.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={24} className="text-textMuted mx-auto mb-2 opacity-40" />
                  <p className="text-textMuted text-xs">You're all caught up</p>
                </div>
              ) : preview.map(n => {
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.booking_updated;
                const Icon = style.icon;
                return (
                  <button
                    key={n._id}
                    onClick={() => { if (!n.isRead) onMarkAsRead(n._id); }}
                    className={`w-full text-left px-5 py-3.5 border-b border-borderSubtle last:border-0 flex items-start gap-3 transition-colors hover:bg-primary/5 ${!n.isRead ? 'bg-primary/[0.03]' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                      <Icon size={15} className={style.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-textMain leading-snug">{n.title}</p>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                      </div>
                      <p className="text-[11px] text-textMuted mt-0.5 line-clamp-2 whitespace-pre-line">{n.message}</p>
                      <p className="text-[10px] text-textMuted/60 mt-1 font-bold uppercase tracking-wider">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { setOpen(false); onGoToPage(); }}
              className="w-full py-3 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 transition-colors border-t border-borderSubtle"
            >
              View All Notifications
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
