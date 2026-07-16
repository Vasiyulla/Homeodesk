import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore, type Notification as NotificationType } from '../store/store';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-500',
    title: 'text-emerald-900',
    message: 'text-emerald-700',
    progress: 'bg-emerald-400',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    title: 'text-red-900',
    message: 'text-red-700',
    progress: 'bg-red-400',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-900',
    message: 'text-blue-700',
    progress: 'bg-blue-400',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-900',
    message: 'text-amber-700',
    progress: 'bg-amber-400',
  },
};

const Toast: React.FC<{ notification: NotificationType }> = ({ notification }) => {
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const colors = colorMap[notification.type];
  const Icon = iconMap[notification.type];
  const duration = notification.duration ?? 4000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        relative flex items-start gap-3 w-80 p-4 rounded-2xl border shadow-lg
        backdrop-blur-xl overflow-hidden
        ${colors.bg} ${colors.border}
      `}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colors.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${colors.title}`}>{notification.title}</p>
        {notification.message && (
          <p className={`text-xs mt-0.5 ${colors.message}`}>{notification.message}</p>
        )}
      </div>
      <button
        onClick={() => removeNotification(notification.id)}
        className="flex-shrink-0 p-0.5 rounded-lg hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <motion.div
          className={`absolute bottom-0 left-0 h-0.5 ${colors.progress}`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
};

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const notifications = useNotificationStore((s) => s.notifications);

  return (
    <>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <Toast key={n.id} notification={n} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default NotificationProvider;
