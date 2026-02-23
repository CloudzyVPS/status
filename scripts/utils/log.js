export const log = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, data || '');
  },
  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, data || '');
  },
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, error || '');
  },
  debug: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG] ${message}`, data || '');
  },
};
