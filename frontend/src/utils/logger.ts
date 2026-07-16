// Centralized logger utility — completely silenced for maximum security
const logger = {
  info: (message: string, data?: unknown): void => {
    // Silenced completely as per user request to prevent any console output
  },
  error: (message: string, error?: unknown): void => {
    // Only log critical application crashes, no data
    if (import.meta.env.DEV) {
      console.error(`[ERROR] ${message}`);
    }
  },
  warn: (message: string, data?: unknown): void => {
    // Silenced
  },
  debug: (message: string, data?: unknown): void => {
    // Silenced
  },
};

export default logger;
