// src/context/offline-context.tsx

"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNetworkStatus } from '@/lib/network-monitor';
import { useSyncStatus, type SyncStatus, type SyncConflict } from '@/lib/sync-manager';
import { offlineDb } from '@/lib/offline-db';

interface OfflineContextType {
  // Network status
  isOnline: boolean;
  lastOnlineTime: Date | null;
  forceNetworkCheck: () => Promise<boolean>;
  
  // Sync status
  syncStatus: SyncStatus;
  syncProgress: number;
  syncError?: string;
  pendingSyncCount: number;
  forcSync: () => Promise<void>;
  
  // Conflicts
  conflicts: SyncConflict[];
  resolveConflict: (collection: string, docId: string, resolution: 'local' | 'remote') => Promise<void>;
  
  // Offline storage stats
  storageStats: {
    totalDocuments: number;
    unsyncedDocuments: number;
    lastSync: Date | null;
  };
  
  // UI state
  showOfflineIndicator: boolean;
  showSyncIndicator: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const { isOnline, forceCheck, lastOnlineTime } = useNetworkStatus();
  const { status, progress, error, conflicts, forceSync, resolveConflict } = useSyncStatus();
  
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [storageStats, setStorageStats] = useState({
    totalDocuments: 0,
    unsyncedDocuments: 0,
    lastSync: null as Date | null
  });

  // Update pending sync count
  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const pendingItems = await offlineDb.getPendingSyncItems();
        setPendingSyncCount(pendingItems.length);
      } catch (error) {
        console.error('Failed to get pending sync count:', error);
      }
    };

    updatePendingCount();
    
    // Update every 10 seconds
    const interval = setInterval(updatePendingCount, 10000);
    return () => clearInterval(interval);
  }, [status]);

  // Update storage stats
  useEffect(() => {
    const updateStorageStats = async () => {
      try {
        const networkStatus = await offlineDb.getNetworkStatus();
        
        // Count total documents across all collections
        let totalDocs = 0;
        let unsyncedDocs = 0;
        
        const collections = ['users', 'drivers', 'vehicles', 'shifts', 'rides', 'maintenanceTickets', 'messages', 'bans'];
        
        for (const collectionName of collections) {
          const table = (offlineDb as any)[collectionName];
          if (table) {
            const count = await table.count();
            totalDocs += count;
            
            const unsyncedCount = await table.filter((doc: any) => 
              doc._offline && !doc._offline.synced
            ).count();
            unsyncedDocs += unsyncedCount;
          }
        }
        
        setStorageStats({
          totalDocuments: totalDocs,
          unsyncedDocuments: unsyncedDocs,
          lastSync: networkStatus.lastSync
        });
      } catch (error) {
        console.error('Failed to update storage stats:', error);
      }
    };

    updateStorageStats();
    
    // Update every 30 seconds
    const interval = setInterval(updateStorageStats, 30000);
    return () => clearInterval(interval);
  }, [status]);

  const contextValue: OfflineContextType = {
    // Network status
    isOnline,
    lastOnlineTime,
    forceNetworkCheck: forceCheck,
    
    // Sync status
    syncStatus: status,
    syncProgress: progress,
    syncError: error,
    pendingSyncCount,
    forcSync: forceSync,
    
    // Conflicts
    conflicts,
    resolveConflict,
    
    // Storage stats
    storageStats,
    
    // UI state
    showOfflineIndicator: !isOnline || pendingSyncCount > 0,
    showSyncIndicator: status === 'syncing' || pendingSyncCount > 0
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

// Individual hooks for specific functionality
export const useNetworkState = () => {
  const { isOnline, lastOnlineTime, forceNetworkCheck } = useOffline();
  return { isOnline, lastOnlineTime, forceNetworkCheck };
};

export const useSyncState = () => {
  const { syncStatus, syncProgress, syncError, pendingSyncCount, forcSync } = useOffline();
  return { syncStatus, syncProgress, syncError, pendingSyncCount, forcSync };
};

export const useConflicts = () => {
  const { conflicts, resolveConflict } = useOffline();
  return { conflicts, resolveConflict };
};

export const useOfflineStats = () => {
  const { storageStats } = useOffline();
  return storageStats;
};