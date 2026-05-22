import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      addNotification: (notification) => {
        set((state) => ({
          notifications: [
            {
              id: Date.now().toString() + Math.random().toString(36).substring(7),
              timestamp: new Date().toISOString(),
              read: false,
              ...notification
            },
            ...state.notifications
          ].slice(0, 50) // Keep the last 50 notifications to prevent storage bloat
        }));
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => 
            n.id === id ? { ...n, read: true } : n
          )
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true }))
        }));
      },
      clearNotifications: () => {
        set({ notifications: [] });
      }
    }),
    {
      name: 'digi-crm-notifications',
    }
  )
);
