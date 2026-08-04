import React from 'react';
import { Bell, Calendar, XCircle, RefreshCw, Pencil, CheckCircle2, Trash2, CheckCheck } from 'lucide-react';

const TYPE_STYLES = {
  booking_created: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Calendar },
  booking_confirmed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
  booking_cancelled: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: XCircle },
  booking_rescheduled: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: RefreshCw },
  booking_updated: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: Pencil }
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
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Full notification history page — newest first, mark-as-read/delete per
 * item, mark-all-read. Data + handlers are owned by ClientPortalDashboard
 * (same source of truth as the bell dropdown) and passed down as props.
 */
const NotificationsPage = ({ notifications, onMarkAsRead, onMarkAllAsRead, onDelete }) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative z-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-textMain uppercase tracking-tight">Notifications</h1>
          <p className="text-textMuted text-sm mt-1">Updates about your meeting room bookings</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-2 bg-surface border border-borderSubtle hover:border-primary/40 text-textMain px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            <CheckCheck size={14} /> Mark All Read
          </button>
        )}
      </div>

      <div className="bg-surface border border-borderSubtle rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-borderSubtle">
          <h2 className="text-sm font-black text-textMain uppercase tracking-widest">
            All Notifications · {notifications.length}
          </h2>
        </div>

        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={32} className="text-textMuted mx-auto mb-3 opacity-40" />
            <p className="text-textMuted text-sm">No notifications yet</p>
          </div>
        ) : notifications.map(n => {
          const style = TYPE_STYLES[n.type] || TYPE_STYLES.booking_updated;
          const Icon = style.icon;
          return (
            <div
              key={n._id}
              className={`px-4 sm:px-6 py-4 border-b border-borderSubtle last:border-0 flex items-start gap-4 group transition-colors ${!n.isRead ? 'bg-primary/[0.03]' : ''} hover:bg-primary/5`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${style.bg} ${style.border}`}>
                <Icon size={18} className={style.color} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-textMain">{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-textMuted mt-1 whitespace-pre-line leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-textMuted/60 mt-2 font-black uppercase tracking-widest">{timeAgo(n.createdAt)}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {!n.isRead && (
                  <button
                    onClick={() => onMarkAsRead(n._id)}
                    title="Mark as read"
                    className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => onDelete(n._id)}
                  title="Delete"
                  className="p-2 text-textMuted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPage;
