// src/lib/network-monitor.ts

import React from 'react';
import { offlineDb } from './offline-db';

export type NetworkStatusListener = (isOnline: boolean) => void;

class NetworkMonitor {
  private listeners: Set<NetworkStatusListener> = new Set();
  private isOnline: boolean = navigator.onLine;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastOnlineCheck: Date = new Date();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Listen for browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Periodic connectivity check (fallback for unreliable browser events)
    this.startPeriodicCheck();

    // Initialize database with current status
    this.updateDatabaseStatus(this.isOnline);
  }

  private handleOnline = async (): Promise<void> => {
    console.log('🟢 Network: Browser reports online');
    
    // Verify actual connectivity with a lightweight request
    const actuallyOnline = await this.verifyConnectivity();
    
    if (actuallyOnline && !this.isOnline) {
      this.isOnline = true;
      this.lastOnlineCheck = new Date();
      await this.updateDatabaseStatus(true);
      this.notifyListeners(true);
      console.log('✅ Network: Connectivity verified, going online');
    }
  };

  private handleOffline = async (): Promise<void> => {
    console.log('🔴 Network: Browser reports offline');
    
    if (this.isOnline) {
      this.isOnline = false;
      await this.updateDatabaseStatus(false);
      this.notifyListeners(false);
      console.log('❌ Network: Going offline');
    }
  };

  private startPeriodicCheck(): void {
    // Check every 30 seconds when online, every 10 seconds when offline
    const checkInterval = this.isOnline ? 30000 : 10000;
    
    this.checkInterval = setInterval(async () => {
      const actuallyOnline = await this.verifyConnectivity();
      
      if (actuallyOnline !== this.isOnline) {
        console.log(`🔄 Network: Periodic check detected change (${actuallyOnline ? 'online' : 'offline'})`);
        this.isOnline = actuallyOnline;
        this.lastOnlineCheck = new Date();
        await this.updateDatabaseStatus(actuallyOnline);
        this.notifyListeners(actuallyOnline);
        
        // Restart interval with new timing
        this.stopPeriodicCheck();
        this.startPeriodicCheck();
      }
    }, checkInterval);
  }

  private stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async verifyConnectivity(): Promise<boolean> {
    try {
      // Try to reach Firebase or Google's public DNS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.log('🔍 Network: Connectivity check failed:', error);
      return false;
    }
  }

  private async updateDatabaseStatus(isOnline: boolean): Promise<void> {
    try {
      await offlineDb.updateNetworkStatus(isOnline);
    } catch (error) {
      console.error('Failed to update network status in database:', error);
    }
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  // Public API
  public getStatus(): boolean {
    return this.isOnline;
  }

  public addListener(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async forceCheck(): Promise<boolean> {
    const actuallyOnline = await this.verifyConnectivity();
    
    if (actuallyOnline !== this.isOnline) {
      this.isOnline = actuallyOnline;
      this.lastOnlineCheck = new Date();
      await this.updateDatabaseStatus(actuallyOnline);
      this.notifyListeners(actuallyOnline);
    }
    
    return actuallyOnline;
  }

  public getLastOnlineTime(): Date {
    return this.lastOnlineCheck;
  }

  public destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.stopPeriodicCheck();
    this.listeners.clear();
  }
}

// Create and export singleton instance
export const networkMonitor = new NetworkMonitor();

// React hook for easy component integration
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(networkMonitor.getStatus());

  React.useEffect(() => {
    const unsubscribe = networkMonitor.addListener(setIsOnline);
    return unsubscribe;
  }, []);

  return {
    isOnline,
    forceCheck: networkMonitor.forceCheck.bind(networkMonitor),
    lastOnlineTime: networkMonitor.getLastOnlineTime()
  };
}

// For server-side or non-React usage
export { NetworkMonitor };