import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'Loading...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`${sizeClasses[size]} rounded-full border-2 border-surface-200 border-t-brand-600`}
      />
      {text && <p className="text-sm text-surface-500 font-medium">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
