import { useState } from 'react';
import { Bell, Check, Trash2, Search } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const typeIcons: Record<string, string> = {
  order: '🛒',
  approval: '✅',
  warning: '⚠️',
  info: 'ℹ️',
  alert: '🔔',
};

const typeColors: Record<string, string> = {
  order: 'bg-blue-100 text-blue-800',
  approval: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-indigo-100 text-indigo-800',
  alert: 'bg-red-100 text-red-800',
};

export const NotificationCenter = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications();

  const filtered = notifications.filter(n => {
    const matchesFilter = filter === 'all' || !n.read;
    const matchesSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-GH');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-text">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filter === f ? 'bg-white shadow-sm text-text' : 'text-text-light hover:text-text'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            className="px-3 py-2 text-text-light hover:text-primary rounded-lg hover:bg-gray-100 transition"
            title="Refresh"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 12a9 9 0 11-1.8-5.4L16 9" />
              <path d="M9 17.5L12 21l3-3.5" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-light">Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-text-light">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(notification => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all ${
                  notification.read
                    ? 'bg-white border-gray-200'
                    : 'bg-primary/5 border-primary/30 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full">
                    <span className="text-xl">{typeIcons[notification.type] || '🔔'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-semibold text-text ${!notification.read ? 'text-primary' : ''}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-text-light mt-1">{notification.message}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColors[notification.type] || 'bg-gray-100 text-gray-800'}`}>
                        {notification.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <span className="text-xs text-text-light">
                        {formatTime(notification.createdAt)}
                      </span>
                      <div className="flex gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1.5 text-text-light hover:text-primary rounded-lg hover:bg-gray-100 transition"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1.5 text-text-light hover:text-red-600 rounded-lg hover:bg-gray-100 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
