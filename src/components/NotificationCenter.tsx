import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notificationService, InAppNotification } from '../services/notificationService';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
      setUnreadCount(notificationService.getUnreadCount());
    });

    return () => unsubscribe();
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Marquer comme lu après un court délai pour que l'utilisateur voie le changement
      setTimeout(() => notificationService.markAllAsRead(), 2000);
    }
  };

  return (
    <div className="relative">
      <button onClick={handleToggle} className="relative p-2 rounded-full hover:bg-gray-100">
        <Bell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-10">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 p-4 text-center">Aucune notification</p>
            ) : (
              notifications.map(notif => (
                <Link 
                  to={notif.link || '#'}
                  key={notif.id}
                  onClick={() => setIsOpen(false)}
                  className={`block p-4 border-b hover:bg-gray-50 ${!notif.read ? 'bg-green-50' : ''}`}>
                  <p className="font-semibold">{notif.title}</p>
                  <p className="text-sm text-gray-600">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(notif.timestamp, { addSuffix: true, locale: fr })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
