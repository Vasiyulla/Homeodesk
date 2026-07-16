import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';

interface SuccessMessageProps {
  message: string;
  onClose?: () => void;
  className?: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ message, onClose, className = '' }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 ${className}`}
      >
        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <p className="text-sm text-emerald-700 font-medium flex-1">{message}</p>
        {onClose && (
          <button onClick={onClose} className="text-emerald-400 hover:text-emerald-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default SuccessMessage;
