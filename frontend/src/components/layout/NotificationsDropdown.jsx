import { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import notificationService from '../../services/notificationService';

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAsRead = async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-surface-200 z-50 overflow-hidden">
          <div className="p-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
            <h3 className="font-semibold text-surface-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-surface-500">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-surface-100">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-4 flex gap-3 hover:bg-surface-50 transition-colors ${!notification.is_read ? 'bg-primary-50/30' : ''}`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="flex-1">
                      <p className={`text-sm ${!notification.is_read ? 'font-medium text-surface-900' : 'text-surface-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-surface-500 mt-1 line-clamp-2">{notification.message}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] text-surface-400">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                        {notification.link && (
                          <Link to={notification.link} className="text-[10px] text-primary-600 font-medium hover:underline">
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button 
                        onClick={(e) => markAsRead(notification.id, e)}
                        className="text-surface-400 hover:text-primary-600 p-1 rounded-full cursor-pointer h-fit"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
