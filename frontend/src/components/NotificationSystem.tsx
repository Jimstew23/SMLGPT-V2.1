import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Bell, CheckCircle, Info, AlertCircle } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  persistent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onDismiss,
  onClearAll
}) => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  useEffect(() => {
    // Request notification permission on component mount
    const requestPermission = async () => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissionGranted(permission === 'granted');
      }
    };

    requestPermission();
  }, []);

  useEffect(() => {
    // Show browser notifications for critical alerts
    notifications.forEach(notification => {
      if (notification.type === 'critical' && permissionGranted) {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/safety-icon.png',
          tag: notification.id,
          requireInteraction: true,
          badge: '/safety-badge.png'
        });

        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
        };

        // Auto-close after 10 seconds unless persistent
        if (!notification.persistent) {
          setTimeout(() => {
            browserNotification.close();
          }, 10000);
        }
      }
    });
  }, [notifications, permissionGranted]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationStyles = (type: Notification['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 shadow-red-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 shadow-yellow-100';
      case 'info':
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
      case 'success':
        return 'bg-green-50 border-green-200 shadow-green-100';
      default:
        return 'bg-gray-50 border-gray-200 shadow-gray-100';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {/* Clear all button */}
      {notifications.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 bg-white px-2 py-1 rounded shadow border"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Notifications */}
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            relative p-4 rounded-lg border shadow-lg backdrop-blur-sm
            ${getNotificationStyles(notification.type)}
            ${notification.type === 'critical' ? 'animate-pulse' : ''}
            transition-all duration-300 ease-in-out
          `}
          role="alert"
          aria-live={notification.type === 'critical' ? 'assertive' : 'polite'}
        >
          {/* Close button */}
          <button
            onClick={() => onDismiss(notification.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="flex items-start space-x-3 pr-6">
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                {notification.message}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {notification.timestamp.toLocaleTimeString()}
                </span>
                
                {notification.actionLabel && notification.onAction && (
                  <button
                    onClick={notification.onAction}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    {notification.actionLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Permission prompt */}
      {!permissionGranted && 'Notification' in window && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-800">
              Enable browser notifications for critical safety alerts
            </span>
          </div>
          <button
            onClick={async () => {
              const permission = await Notification.requestPermission();
              setPermissionGranted(permission === 'granted');
            }}
            className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200"
          >
            Enable Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;
