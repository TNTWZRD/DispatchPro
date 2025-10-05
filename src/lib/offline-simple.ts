// src/lib/offline-simple.ts
// Simplified offline integration to avoid module loading issues

"use client";

import React from 'react';

// Simple localStorage-based offline storage for immediate use
export class SimpleOfflineStorage {
  private static prefix = 'dispatchpro_offline_';

  static set(key: string, data: any): void {
    try {
      const timestamped = {
        data,
        timestamp: Date.now(),
        synced: false
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(timestamped));
    } catch (error) {
      console.warn('Failed to store offline data:', error);
    }
  }

  static get(key: string): any {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.data;
      }
    } catch (error) {
      console.warn('Failed to retrieve offline data:', error);
    }
    return null;
  }

  static getAll(prefix: string): any[] {
    const items: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix + prefix)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            items.push({ ...parsed.data, _localKey: key });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve offline data list:', error);
    }
    return items;
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to remove offline data:', error);
    }
  }

  static clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear offline data:', error);
    }
  }
}

// Simple network status checker
export class SimpleNetworkMonitor {
  private static listeners: ((isOnline: boolean) => void)[] = [];
  private static isOnline = navigator.onLine;

  static initialize(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Periodic check
    setInterval(() => {
      this.checkConnectivity();
    }, 30000);
  }

  private static handleOnline = (): void => {
    this.isOnline = true;
    this.notifyListeners(true);
  };

  private static handleOffline = (): void => {
    this.isOnline = false;
    this.notifyListeners(false);
  };

  static async checkConnectivity(): Promise<void> {
    try {
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
      if (!this.isOnline) {
        this.isOnline = true;
        this.notifyListeners(true);
      }
    } catch {
      if (this.isOnline) {
        this.isOnline = false;
        this.notifyListeners(false);
      }
    }
  }

  private static notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline));
  }

  static getStatus(): boolean {
    return this.isOnline;
  }

  static addListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  static destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners = [];
  }
}

// Simple offline-aware data operations
export class SimpleOfflineData {
  static async get(collection: string, id?: string) {
    if (id) {
      return SimpleOfflineStorage.get(`${collection}_${id}`);
    } else {
      return SimpleOfflineStorage.getAll(collection);
    }
  }

  static async set(collection: string, id: string, data: any) {
    SimpleOfflineStorage.set(`${collection}_${id}`, { ...data, id });
    
    // If online, try to sync immediately
    if (SimpleNetworkMonitor.getStatus()) {
      // Add to sync queue or perform immediate sync
      console.log('Would sync to Firebase:', collection, id, data);
    }
  }

  static async update(collection: string, id: string, updates: any) {
    const existing = SimpleOfflineStorage.get(`${collection}_${id}`);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    SimpleOfflineStorage.set(`${collection}_${id}`, updated);
    
    if (SimpleNetworkMonitor.getStatus()) {
      console.log('Would update in Firebase:', collection, id, updates);
    }
  }

  static async delete(collection: string, id: string) {
    SimpleOfflineStorage.remove(`${collection}_${id}`);
    
    if (SimpleNetworkMonitor.getStatus()) {
      console.log('Would delete from Firebase:', collection, id);
    }
  }
}

// Simple React hooks
export function useSimpleOffline() {
  const [isOnline, setIsOnline] = React.useState(SimpleNetworkMonitor.getStatus());

  React.useEffect(() => {
    const unsubscribe = SimpleNetworkMonitor.addListener(setIsOnline);
    return unsubscribe;
  }, []);

  return {
    isOnline,
    storage: SimpleOfflineData,
    forceCheck: () => SimpleNetworkMonitor.checkConnectivity()
  };
}

// Initialize when module loads
if (typeof window !== 'undefined') {
  SimpleNetworkMonitor.initialize();
}