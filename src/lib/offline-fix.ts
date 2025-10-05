// src/lib/offline-fix.ts
// Fixed version that avoids module resolution issues

"use client";

// Browser-safe offline utilities
export const offlineUtils = {
  // Check if we're in browser environment
  isBrowser: typeof window !== 'undefined',

  // Simple network status
  isOnline(): boolean {
    return this.isBrowser ? navigator.onLine : true;
  },

  // localStorage wrapper with error handling
  storage: {
    set(key: string, value: any): boolean {
      if (!offlineUtils.isBrowser) return false;
      try {
        localStorage.setItem(key, JSON.stringify({
          data: value,
          timestamp: Date.now()
        }));
        return true;
      } catch (error) {
        console.warn('Failed to store data:', error);
        return false;
      }
    },

    get(key: string): any {
      if (!offlineUtils.isBrowser) return null;
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.data;
        }
      } catch (error) {
        console.warn('Failed to retrieve data:', error);
      }
      return null;
    },

    remove(key: string): boolean {
      if (!offlineUtils.isBrowser) return false;
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn('Failed to remove data:', error);
        return false;
      }
    },

    clear(prefix?: string): boolean {
      if (!offlineUtils.isBrowser) return false;
      try {
        if (prefix) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        } else {
          localStorage.clear();
        }
        return true;
      } catch (error) {
        console.warn('Failed to clear data:', error);
        return false;
      }
    }
  },

  // Simple event emitter for network status
  events: {
    listeners: new Map<string, Function[]>(),

    on(event: string, callback: Function): () => void {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(callback);

      return () => {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      };
    },

    emit(event: string, ...args: any[]): void {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(...args);
          } catch (error) {
            console.error('Event callback error:', error);
          }
        });
      }
    }
  }
};

// Initialize network monitoring if in browser
if (offlineUtils.isBrowser) {
  let currentStatus = navigator.onLine;

  const handleOnline = () => {
    if (!currentStatus) {
      currentStatus = true;
      offlineUtils.events.emit('network', true);
    }
  };

  const handleOffline = () => {
    if (currentStatus) {
      currentStatus = false;
      offlineUtils.events.emit('network', false);
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Periodic connectivity check
  setInterval(async () => {
    try {
      await fetch('/favicon.ico', { 
        method: 'HEAD', 
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      handleOnline();
    } catch {
      handleOffline();
    }
  }, 30000);
}

export default offlineUtils;