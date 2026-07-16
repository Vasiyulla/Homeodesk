import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { notificationApi, Notification } from '../services/notificationApi';
import { Bell, Check, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRelativeDate } from '../utils/dateFormatter';
import { useAuthStore } from '../store/store';
import Badge from './Badge';

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { 
    notifications, 
    unreadCount, 
    setNotifications, 
    addNotification,
    markAsRead, 
    markAllAsRead, 
    setLoading 
  } = useNotificationStore();

  const [ws, setWs] = useState<WebSocket | null>(null);

  // Fetch initial notifications
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      setLoading(true);
      const result = await notificationApi.getNotifications();
      if (result.success && result.data) {
        setNotifications(result.data);
      }
      setLoading(false);
    };
    
    fetchNotifications();
  }, [user, setNotifications, setLoading]);

  // Connect to WebSocket
  useEffect(() => {
    if (!user) return;

    // We assume the token is in localStorage for the WS auth
    const token = localStorage.getItem('token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use the proxy if we are in dev (localhost:3000), but standard WebSocket doesn't always proxy well in Vite without config.
    // Let's use the explicit backend URL based on the apiClient pattern.
    const isDesktopApp = (window as any).__TAURI__ !== undefined || window.location.protocol.includes('tauri');
    const host = isDesktopApp ? '127.0.0.1:8000' : (import.meta.env.VITE_API_URL || '127.0.0.1:8000').replace(/^https?:\/\//, '');
    
    const wsUrl = `${protocol}//${host}/ws/notifications?token=${token}`;
    
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Assuming the server sends a Notification object
        if (data && data.id) {
          addNotification(data as Notification);
        }
      } catch (e) {
        console.error('Error parsing notification WS message', e);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [user, addNotification]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(id);
    await notificationApi.markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    markAllAsRead();
    await notificationApi.markAllAsRead();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
      notificationApi.markAsRead(notification.id);
    }
    
    setIsOpen(false);

    if (notification.related_entity_type === 'CASE' && notification.related_entity_id) {
      navigate(`/cases/${notification.related_entity_id}`);
    } else if (notification.related_entity_type === 'APPOINTMENT') {
      navigate(`/appointments`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'ALERT': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-brand-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-surface-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
              <h3 className="font-bold text-surface-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                  <p className="text-sm text-surface-500">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-surface-50 transition-colors cursor-pointer flex gap-3 ${
                        !notification.is_read ? 'bg-brand-50/30' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm font-semibold truncate ${!notification.is_read ? 'text-surface-900' : 'text-surface-700'}`}>
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-surface-400 whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeDate(notification.created_at)}
                          </span>
                        </div>
                        <p className={`text-xs line-clamp-2 ${!notification.is_read ? 'text-surface-600 font-medium' : 'text-surface-500'}`}>
                          {notification.message}
                        </p>
                        
                        {!notification.is_read && (
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                            >
                              Mark read
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-500 mt-2"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-2 border-t border-surface-100 bg-surface-50 text-center">
              <span className="text-xs text-surface-400 font-medium">Real-time updates enabled</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
