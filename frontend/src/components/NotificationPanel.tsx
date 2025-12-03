import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { markAsRead, markAllAsRead, deleteNotification } from '../store/notificationsSlice';
import { Bell, X, Video } from 'lucide-react';
import { Button } from './ui/button';

interface NotificationPanelProps {
  onVideoClick: (videoId: string) => void;
}

export function NotificationPanel({ onVideoClick }: NotificationPanelProps) {
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.notifications.notifications);

  const handleNotificationClick = (notificationId: string, videoId: string) => {
    dispatch(markAsRead(notificationId));
    onVideoClick(videoId);
  };

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
  };

  const handleDelete = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(deleteNotification(notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-80 max-h-96 overflow-hidden flex flex-col">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-600" />
          <h3 className="text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-clipiq text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
            <p className="text-xs mt-1">Subscribe to channels to get notified!</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 hover:bg-zinc-800 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-zinc-800/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification.id, notification.videoId)}
              >
                <div className="flex items-start gap-3">
                  <div style={{ backgroundColor: 'rgba(255, 59, 92, 0.2)' }} className="p-2 rounded-full flex-shrink-0">
                    <Video className="w-4 h-4" style={{ color: '#ff3b5c' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      <span className="font-medium">{notification.uploaderUsername}</span> uploaded a new video
                    </p>
                    <p className="text-zinc-400 text-xs mt-1 truncate">
                      {notification.videoTitle}
                    </p>
                    <p className="text-zinc-600 text-xs mt-1">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(notification.id, e)}
                    className="text-zinc-500 hover:text-white flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}