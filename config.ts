
export const CONFIG = {
  // SET THIS TO FALSE TO ENABLE PRODUCTION SOCKET MODE
  USE_MOCK_SERVICE: true, 
  
  // Production Backend URL
  // If env var is set, use it.
  // Otherwise, if running in browser, derive from current location (for Docker/Prod).
  // Fallback to localhost:8080 for local dev.
  get SOCKET_URL() {
    if (typeof process !== 'undefined' && process.env?.REACT_APP_SOCKET_URL) {
      return process.env.REACT_APP_SOCKET_URL;
    }
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In production (Docker), backend serves frontend on same port, so use window.location.host
      // If we are on port 5173 (Vite Dev), assume backend is on 8080
      const host = window.location.port === '5173' 
        ? `${window.location.hostname}:8080` 
        : window.location.host;
        
      return `${protocol}//${host}`;
    }
    return 'ws://localhost:8080';
  },
  
  // Audio Settings
  DEFAULT_VOLUME: 0.5,
};