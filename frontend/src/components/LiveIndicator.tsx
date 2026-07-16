import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';

interface LiveIndicatorProps {
  isConnected: boolean;
}

const LiveIndicator: React.FC<LiveIndicatorProps> = ({ isConnected }) => {
  if (!isConnected) {
    return (
      <div className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-100 shadow-sm">
        <WifiOff className="w-3 h-3" />
        Offline
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm">
      <div className="relative flex h-2.5 w-2.5">
        <motion.span 
          animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
        />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </div>
      <Wifi className="w-3 h-3" />
      Live
    </div>
  );
};

export default LiveIndicator;
