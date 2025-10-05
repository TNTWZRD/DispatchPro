// src/lib/sync-manager.ts

import React from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { offlineDb, type OfflineQueueItem, type OfflineDocument } from './offline-db';
import { networkMonitor } from './network-monitor';
import type { 
  AppUser, 
  Driver, 
  Vehicle, 
  Shift, 
  Ride, 
  MaintenanceTicket, 
  Message, 
  Ban 
} from './types';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'conflicts';
export type SyncListener = (status: SyncStatus, progress?: number, error?: string) => void;

interface SyncConflict {
  collection: string;
  docId: string;
  localData: any;
  remoteData: any;
  conflictType: 'modified' | 'deleted' | 'created';
}

class SyncManager {
  private syncStatus: SyncStatus = 'idle';
  private listeners: Set<SyncListener> = new Set();
  private syncInProgress = false;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private conflicts: SyncConflict[] = [];
  private firestoreListeners: Map<string, () => void> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Listen for network status changes
    networkMonitor.addListener(this.handleNetworkChange);
    
    // Start automatic sync when online
    if (networkMonitor.getStatus()) {
      this.startAutoSync();
    }
  }

  private handleNetworkChange = async (isOnline: boolean): Promise<void> => {
    if (isOnline) {
      console.log('🔄 Sync: Network back online, starting sync...');
      this.startAutoSync();
      await this.performFullSync();
    } else {
      console.log('⏸️ Sync: Network offline, stopping auto sync');
      this.stopAutoSync();
      this.stopFirestoreListeners();
    }
  };

  private startAutoSync(): void {
    if (this.autoSyncInterval) return;
    
    // Sync every 30 seconds when online
    this.autoSyncInterval = setInterval(async () => {
      if (networkMonitor.getStatus() && !this.syncInProgress) {
        await this.syncPendingChanges();
      }
    }, 30000);
  }

  private stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  private stopFirestoreListeners(): void {
    this.firestoreListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.firestoreListeners.clear();
  }

  // Main sync operations
  public async performFullSync(): Promise<void> {
    if (this.syncInProgress || !networkMonitor.getStatus()) {
      return;
    }

    this.syncInProgress = true;
    this.updateStatus('syncing');
    
    try {
      console.log('🚀 Sync: Starting full sync...');
      
      // 1. Push pending local changes to Firestore
      await this.syncPendingChanges();
      
      // 2. Pull latest data from Firestore
      await this.pullLatestData();
      
      // 3. Set up real-time listeners for future changes
      this.setupRealtimeListeners();
      
      // 4. Update last sync timestamp
      await offlineDb.updateLastSync();
      
      console.log('✅ Sync: Full sync completed successfully');
      this.updateStatus('idle');
      
    } catch (error) {
      console.error('❌ Sync: Full sync failed:', error);
      this.updateStatus('error', 0, error instanceof Error ? error.message : 'Sync failed');
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncPendingChanges(): Promise<void> {
    const pendingItems = await offlineDb.getPendingSyncItems();
    
    if (pendingItems.length === 0) {
      return;
    }

    console.log(`📤 Sync: Processing ${pendingItems.length} pending changes...`);
    
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      
      try {
        await this.processSyncItem(item);
        await offlineDb.markQueueItemProcessed(item.id);
        
        // Update progress
        const progress = ((i + 1) / pendingItems.length) * 50; // First 50% for pushing changes
        this.updateStatus('syncing', progress);
        
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        
        if (item.retryCount < 3) {
          await offlineDb.markQueueItemFailed(item.id, error instanceof Error ? error.message : 'Unknown error');
        } else {
          // Max retries reached, remove from queue
          await offlineDb.markQueueItemProcessed(item.id);
          console.warn(`Max retries reached for sync item ${item.id}, removing from queue`);
        }
      }
    }
  }

  private async processSyncItem(item: OfflineQueueItem): Promise<void> {
    const docRef = doc(db, item.collection, item.docId);
    
    switch (item.operation) {
      case 'create':
      case 'update':
        if (item.data) {
          // Remove offline metadata before sending to Firestore
          const { _offline, ...cleanData } = item.data;
          
          // Convert dates and timestamps
          const firestoreData = this.prepareDataForFirestore(cleanData);
          
          if (item.operation === 'create') {
            await setDoc(docRef, {
              ...firestoreData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else {
            await updateDoc(docRef, {
              ...firestoreData,
              updatedAt: serverTimestamp()
            });
          }
        }
        break;
        
      case 'delete':
        await deleteDoc(docRef);
        break;
    }
  }

  private prepareDataForFirestore(data: any): any {
    const prepared = { ...data };
    
    // Convert Date objects to Firestore Timestamps
    Object.keys(prepared).forEach(key => {
      if (prepared[key] instanceof Date) {
        prepared[key] = Timestamp.fromDate(prepared[key]);
      }
    });
    
    return prepared;
  }

  private async pullLatestData(): Promise<void> {
    const collections = [
      'users', 'drivers', 'vehicles', 'shifts', 
      'rides', 'maintenanceTickets', 'messages', 'bans'
    ];
    
    for (let i = 0; i < collections.length; i++) {
      const collectionName = collections[i];
      
      try {
        await this.syncCollection(collectionName);
        
        // Update progress (50-100% for pulling data)
        const progress = 50 + ((i + 1) / collections.length) * 50;
        this.updateStatus('syncing', progress);
        
      } catch (error) {
        console.error(`Failed to sync collection ${collectionName}:`, error);
        throw error;
      }
    }
  }

  private async syncCollection(collectionName: string): Promise<void> {
    console.log(`📥 Sync: Syncing collection ${collectionName}...`);
    
    // Get last sync timestamp for this collection
    const syncMetadata = await offlineDb.getSyncMetadata(collectionName);
    const lastSync = syncMetadata?.lastSyncTimestamp || new Date(0);
    
    // Query for documents modified since last sync
    const q = query(
      collection(db, collectionName),
      where('updatedAt', '>', Timestamp.fromDate(lastSync)),
      orderBy('updatedAt', 'desc'),
      limit(1000) // Batch size
    );
    
    const snapshot = await getDocs(q);
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to dates
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      startTime: doc.data().startTime?.toDate(),
      endTime: doc.data().endTime?.toDate(),
      scheduledTime: doc.data().scheduledTime?.toDate(),
      timestamp: doc.data().timestamp?.toDate(),
      assignedAt: doc.data().assignedAt?.toDate(),
      pickedUpAt: doc.data().pickedUpAt?.toDate(),
      droppedOffAt: doc.data().droppedOffAt?.toDate(),
      cancelledAt: doc.data().cancelledAt?.toDate(),
      completionTime: doc.data().completionTime?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate()
    }));
    
    if (documents.length > 0) {
      // Check for conflicts before updating
      await this.checkForConflicts(collectionName, documents);
      
      // Update local database
      const table = (offlineDb as any)[collectionName];
      if (table) {
        await offlineDb.bulkPutWithMetadata(table, documents as OfflineDocument[], true);
      }
      
      // Update sync metadata
      const latestTimestamp = documents[0].updatedAt || new Date();
      await offlineDb.updateSyncMetadata(collectionName, latestTimestamp);
    }
  }

  private async checkForConflicts(collectionName: string, remoteDocuments: any[]): Promise<void> {
    const table = (offlineDb as any)[collectionName];
    if (!table) return;

    for (const remoteDoc of remoteDocuments) {
      const localDoc = await table.get(remoteDoc.id);
      
      if (localDoc && localDoc._offline && !localDoc._offline.synced) {
        // Document exists locally with unsynced changes
        const localModified = localDoc._offline.lastModified;
        const remoteModified = remoteDoc.updatedAt;
        
        if (remoteModified > localModified) {
          // Remote version is newer, but we have local changes - conflict!
          this.conflicts.push({
            collection: collectionName,
            docId: remoteDoc.id,
            localData: localDoc,
            remoteData: remoteDoc,
            conflictType: 'modified'
          });
          
          // Mark local document as conflicted
          await table.update(remoteDoc.id, {
            '_offline.conflicted': true,
            '_offline.originalData': remoteDoc
          });
        }
      }
    }
    
    if (this.conflicts.length > 0) {
      this.updateStatus('conflicts');
    }
  }

  private setupRealtimeListeners(): void {
    const collections = [
      'users', 'drivers', 'vehicles', 'shifts', 
      'rides', 'maintenanceTickets', 'messages', 'bans'
    ];
    
    collections.forEach(collectionName => {
      if (this.firestoreListeners.has(collectionName)) {
        return; // Already listening
      }
      
      const q = collection(db, collectionName);
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          this.handleRealtimeUpdate(collectionName, snapshot);
        },
        (error) => {
          console.error(`Realtime listener error for ${collectionName}:`, error);
        }
      );
      
      this.firestoreListeners.set(collectionName, unsubscribe);
    });
  }

  private async handleRealtimeUpdate(collectionName: string, snapshot: any): Promise<void> {
    const table = (offlineDb as any)[collectionName];
    if (!table) return;

    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      const doc = change.doc;
      const data = {
        id: doc.id,
        ...doc.data(),
        // Convert timestamps
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
        scheduledTime: doc.data().scheduledTime?.toDate(),
        timestamp: doc.data().timestamp?.toDate()
      };
      
      switch (change.type) {
        case 'added':
        case 'modified':
          // Check if we have local unsynced changes for this document
          const localDoc = await table.get(doc.id);
          if (localDoc && localDoc._offline && !localDoc._offline.synced) {
            // Potential conflict, don't overwrite
            await this.checkForConflicts(collectionName, [data]);
          } else {
            // Safe to update
            await table.put({
              ...data,
              _offline: {
                id: doc.id,
                lastModified: new Date(),
                synced: true
              }
            });
          }
          break;
          
        case 'removed':
          await table.delete(doc.id);
          break;
      }
    }
  }

  // Public API
  public addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getStatus(): SyncStatus {
    return this.syncStatus;
  }

  public getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }

  public async resolveConflict(
    collection: string, 
    docId: string, 
    resolution: 'local' | 'remote'
  ): Promise<void> {
    await offlineDb.resolveConflict(collection, docId, resolution);
    
    // Remove from conflicts list
    this.conflicts = this.conflicts.filter(
      conflict => !(conflict.collection === collection && conflict.docId === docId)
    );
    
    if (this.conflicts.length === 0) {
      this.updateStatus('idle');
    }
  }

  public async forceSync(): Promise<void> {
    if (networkMonitor.getStatus()) {
      await this.performFullSync();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  private updateStatus(status: SyncStatus, progress?: number, error?: string): void {
    this.syncStatus = status;
    this.listeners.forEach(listener => {
      try {
        listener(status, progress, error);
      } catch (err) {
        console.error('Error in sync status listener:', err);
      }
    });
  }

  public destroy(): void {
    this.stopAutoSync();
    this.stopFirestoreListeners();
    this.listeners.clear();
  }
}

// Create and export singleton instance
export const syncManager = new SyncManager();

// React hook for sync status
export function useSyncStatus() {
  const [status, setStatus] = React.useState<SyncStatus>(syncManager.getStatus());
  const [progress, setProgress] = React.useState<number>(0);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    const unsubscribe = syncManager.addListener((newStatus, newProgress, newError) => {
      setStatus(newStatus);
      setProgress(newProgress || 0);
      setError(newError);
    });
    
    return unsubscribe;
  }, []);

  return {
    status,
    progress,
    error,
    conflicts: syncManager.getConflicts(),
    forceSync: syncManager.forceSync.bind(syncManager),
    resolveConflict: syncManager.resolveConflict.bind(syncManager)
  };
}

export { SyncManager };
export type { SyncConflict };