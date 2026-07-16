import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import type { ApiError } from '../types';

interface ErrorAlertProps {
  error: ApiError | { message: string };
  onClose?: () => void;
  title?: string;
  className?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onClose, title = 'Error', className = '' }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 ${className}`}
      >
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-800">{title}</h4>
          <p className="text-sm text-red-700 mt-0.5">{error.message}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-red-400 hover:text-red-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ErrorAlert;
