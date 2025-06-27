import { useState, useCallback } from 'react';
import { Notification } from '../components/NotificationSystem';

interface UseNotificationsReturn {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addCriticalHazardAlert: (hazardData: any) => void;
  addFileProcessedAlert: (fileData: any) => void;
  addSuccessAlert: (title: string, message: string) => void;
  addErrorAlert: (title: string, message: string) => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-dismiss non-persistent notifications after 5 seconds
    if (!notification.persistent && notification.type !== 'critical') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const addCriticalHazardAlert = useCallback((hazardData: any) => {
    addNotification({
      type: 'critical',
      title: 'Critical Safety Hazard Detected',
      message: `${hazardData.type || 'Unknown hazard'} identified with ${
        hazardData.confidence ? `${Math.round(hazardData.confidence * 100)}% confidence` : 'high confidence'
      }. Immediate attention required.`,
      persistent: true,
      actionLabel: 'View Details',
      onAction: () => {
        // Scroll to the message or highlight it
        const messageElement = document.querySelector(`[data-message-id="${hazardData.messageId}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          messageElement.classList.add('highlight-critical');
          setTimeout(() => {
            messageElement.classList.remove('highlight-critical');
          }, 3000);
        }
      }
    });
  }, [addNotification]);

  const addFileProcessedAlert = useCallback((fileData: any) => {
    const isSuccess = fileData.status === 'processed' || fileData.status === 'completed';
    
    addNotification({
      type: isSuccess ? 'success' : 'warning',
      title: isSuccess ? 'File Processed Successfully' : 'File Processing Issue',
      message: isSuccess 
        ? `${fileData.fileName || 'File'} has been analyzed and processed.`
        : `${fileData.fileName || 'File'} processing encountered an issue: ${fileData.error || 'Unknown error'}.`,
      actionLabel: isSuccess ? 'View Analysis' : 'Retry',
      onAction: () => {
        if (isSuccess) {
          // Navigate to file analysis results
          const analysisElement = document.querySelector(`[data-file-id="${fileData.fileId}"]`);
          if (analysisElement) {
            analysisElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          // Trigger retry logic
          console.log('Retrying file processing for:', fileData.fileName);
        }
      }
    });
  }, [addNotification]);

  const addSuccessAlert = useCallback((title: string, message: string) => {
    addNotification({
      type: 'success',
      title,
      message
    });
  }, [addNotification]);

  const addErrorAlert = useCallback((title: string, message: string) => {
    addNotification({
      type: 'critical',
      title,
      message,
      persistent: true
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    addCriticalHazardAlert,
    addFileProcessedAlert,
    addSuccessAlert,
    addErrorAlert
  };
};

export default useNotifications;
