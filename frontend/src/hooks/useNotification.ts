import { useNotificationStore, type NotificationType } from '../store/store';

/**
 * Convenience hook for pushing toast notifications from any component.
 */
export function useNotification() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  return {
    notify: (type: NotificationType, title: string, message?: string, duration?: number) => {
      addNotification({ type, title, message, duration });
    },
    success: (title: string, message?: string) => {
      addNotification({ type: 'success', title, message });
    },
    error: (title: string, message?: string) => {
      addNotification({ type: 'error', title, message, duration: 6000 });
    },
    info: (title: string, message?: string) => {
      addNotification({ type: 'info', title, message });
    },
    warning: (title: string, message?: string) => {
      addNotification({ type: 'warning', title, message, duration: 5000 });
    },
  };
}
