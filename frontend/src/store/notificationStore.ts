import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Notification } from '../services/notificationApi';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.is_read).length,
        }),

      addNotification: (notification) =>
        set((state) => {
          // Prevent duplicates
          if (state.notifications.some((n) => n.id === notification.id)) {
            return state;
          }
          const newNotifications = [notification, ...state.notifications];
          return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter((n) => !n.is_read).length,
          };
        }),

      markAsRead: (id) =>
        set((state) => {
          const newNotifications = state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          );
          return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter((n) => !n.is_read).length,
          };
        }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        })),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'NotificationStore' }
  )
);
