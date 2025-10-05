// src/lib/offline-db.ts

import Dexie, { Table } from 'dexie';
import type { 
  AppUser, 
  Driver, 
  Vehicle, 
  Shift, 
  Ride, 
  MaintenanceTicket, 
  TicketActivity, 
  Message, 
  Ban 
} from './types';

// Offline-specific types
export interface OfflineQueueItem {
  id: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: Date;
  userId: string;
  retryCount: number;
  error?: string;
}

export interface NetworkStatus {
  id: 'network-status';
  isOnline: boolean;
  lastOnline: Date;
  lastSync: Date;
}

export interface SyncMetadata {
  id: string;
  collection: string;
  lastSyncTimestamp: Date;
  lastModified: Date;
  syncVersion: number;
}

// Extended types with offline metadata
export interface OfflineDocument {
  _offline?: {
    id: string;
    lastModified: Date;
    synced: boolean;
    pendingOperation?: 'create' | 'update' | 'delete';
    conflicted?: boolean;
    originalData?: any;
  };
}

export type OfflineUser = AppUser & OfflineDocument;
export type OfflineDriver = Driver & OfflineDocument;
export type OfflineVehicle = Vehicle & OfflineDocument;
export type OfflineShift = Shift & OfflineDocument;
export type OfflineRide = Ride & OfflineDocument;
export type OfflineMaintenanceTicket = MaintenanceTicket & OfflineDocument;
export type OfflineTicketActivity = TicketActivity & OfflineDocument;
export type OfflineMessage = Message & OfflineDocument;
export type OfflineBan = Ban & OfflineDocument;

class OfflineDatabase extends Dexie {
  // Main data tables (mirror Firestore collections)
  users!: Table<OfflineUser>;
  drivers!: Table<OfflineDriver>;
  vehicles!: Table<OfflineVehicle>;
  shifts!: Table<OfflineShift>;
  rides!: Table<OfflineRide>;
  maintenanceTickets!: Table<OfflineMaintenanceTicket>;
  ticketActivities!: Table<OfflineTicketActivity>;
  messages!: Table<OfflineMessage>;
  bans!: Table<OfflineBan>;

  // Offline management tables
  syncQueue!: Table<OfflineQueueItem>;
  networkStatus!: Table<NetworkStatus>;
  syncMetadata!: Table<SyncMetadata>;

  constructor() {
    super('DispatchProOffline');
    
    this.version(1).stores({
      // Main data tables
      users: 'id, uid, email, role, name, phoneNumber, disabled',
      drivers: 'id, name, phoneNumber, status, currentShiftId',
      vehicles: 'id, nickname, make, model, year, vin, status, currentShiftId',
      shifts: 'id, driverId, vehicleId, status, startTime, endTime',
      rides: 'id, status, driverId, shiftId, createdAt, scheduledTime, totalFare, passengerPhone',
      maintenanceTickets: 'id, vehicleId, status, priority, reportedById, createdAt',
      ticketActivities: 'id, ticketId, userId, timestamp, type',
      messages: 'id, senderId, recipientId, timestamp, threadId',
      bans: 'id, name, phone, bannedById, createdAt',

      // Offline management tables
      syncQueue: '++id, collection, docId, operation, timestamp, userId, retryCount',
      networkStatus: 'id',
      syncMetadata: 'id, collection, lastSyncTimestamp'
    });

    // Add hooks for automatic offline metadata
    this.users.hook('creating', this.addOfflineMetadata);
    this.drivers.hook('creating', this.addOfflineMetadata);
    this.vehicles.hook('creating', this.addOfflineMetadata);
    this.shifts.hook('creating', this.addOfflineMetadata);
    this.rides.hook('creating', this.addOfflineMetadata);
    this.maintenanceTickets.hook('creating', this.addOfflineMetadata);
    this.ticketActivities.hook('creating', this.addOfflineMetadata);
    this.messages.hook('creating', this.addOfflineMetadata);
    this.bans.hook('creating', this.addOfflineMetadata);

    this.users.hook('updating', this.updateOfflineMetadata);
    this.drivers.hook('updating', this.updateOfflineMetadata);
    this.vehicles.hook('updating', this.updateOfflineMetadata);
    this.shifts.hook('updating', this.updateOfflineMetadata);
    this.rides.hook('updating', this.updateOfflineMetadata);
    this.maintenanceTickets.hook('updating', this.updateOfflineMetadata);
    this.ticketActivities.hook('updating', this.updateOfflineMetadata);
    this.messages.hook('updating', this.updateOfflineMetadata);
    this.bans.hook('updating', this.updateOfflineMetadata);
  }

  private addOfflineMetadata = (primKey: any, obj: any, trans: any) => {
    obj._offline = {
      id: obj.id || primKey,
      lastModified: new Date(),
      synced: false,
      pendingOperation: 'create'
    };
  };

  private updateOfflineMetadata = (modifications: any, primKey: any, obj: any, trans: any) => {
    modifications._offline = {
      ...obj._offline,
      lastModified: new Date(),
      synced: false,
      pendingOperation: obj._offline?.pendingOperation || 'update'
    };
  };

  // Helper methods for offline operations
  async addToSyncQueue(
    collection: string,
    docId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any,
    userId?: string
  ): Promise<void> {
    await this.syncQueue.add({
      id: `${collection}-${docId}-${operation}-${Date.now()}`,
      collection,
      docId,
      operation,
      data,
      timestamp: new Date(),
      userId: userId || 'unknown',
      retryCount: 0
    });
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    const status = await this.networkStatus.get('network-status');
    return status || {
      id: 'network-status',
      isOnline: navigator.onLine,
      lastOnline: new Date(),
      lastSync: new Date(0)
    };
  }

  async updateNetworkStatus(isOnline: boolean): Promise<void> {
    const now = new Date();
    await this.networkStatus.put({
      id: 'network-status',
      isOnline,
      lastOnline: isOnline ? now : (await this.getNetworkStatus()).lastOnline,
      lastSync: (await this.getNetworkStatus()).lastSync
    });
  }

  async updateLastSync(): Promise<void> {
    const status = await this.getNetworkStatus();
    await this.networkStatus.put({
      ...status,
      lastSync: new Date()
    });
  }

  async getSyncMetadata(collection: string): Promise<SyncMetadata | undefined> {
    return await this.syncMetadata.get(collection);
  }

  async updateSyncMetadata(collection: string, lastSyncTimestamp: Date): Promise<void> {
    await this.syncMetadata.put({
      id: collection,
      collection,
      lastSyncTimestamp,
      lastModified: new Date(),
      syncVersion: 1
    });
  }

  // Bulk operations for efficient syncing
  async bulkPutWithMetadata<T extends OfflineDocument>(
    table: Table<T>,
    items: T[],
    synced: boolean = true
  ): Promise<void> {
    const now = new Date();
    const itemsWithMetadata = items.map(item => ({
      ...item,
      _offline: {
        id: item.id,
        lastModified: now,
        synced,
        pendingOperation: synced ? undefined : 'create'
      }
    }));
    
    await table.bulkPut(itemsWithMetadata);
  }

  async clearPendingQueue(): Promise<void> {
    await this.syncQueue.clear();
  }

  async getPendingSyncItems(): Promise<OfflineQueueItem[]> {
    return await this.syncQueue.orderBy('timestamp').toArray();
  }

  async markQueueItemProcessed(id: string): Promise<void> {
    await this.syncQueue.delete(id);
  }

  async markQueueItemFailed(id: string, error: string): Promise<void> {
    const item = await this.syncQueue.get(id);
    if (item) {
      await this.syncQueue.update(id, {
        retryCount: item.retryCount + 1,
        error
      });
    }
  }

  // Collection-specific helper methods
  async getRidesByStatus(status: string[]): Promise<OfflineRide[]> {
    return await this.rides.where('status').anyOf(status).toArray();
  }

  async getActiveShifts(): Promise<OfflineShift[]> {
    return await this.shifts.where('status').equals('active').toArray();
  }

  async getUnreadMessages(userId: string): Promise<OfflineMessage[]> {
    return await this.messages
      .where('recipientId').equals(userId)
      .and(msg => !msg.isReadBy?.includes(userId))
      .toArray();
  }

  async getMessagesInThread(threadId: string[]): Promise<OfflineMessage[]> {
    return await this.messages
      .where('threadId').equals(threadId.sort().join(','))
      .sortBy('timestamp');
  }

  // Conflict resolution helpers
  async getConflictedDocuments(): Promise<{ collection: string; documents: OfflineDocument[] }[]> {
    const conflicts = [];
    const tables = [
      { name: 'users', table: this.users },
      { name: 'drivers', table: this.drivers },
      { name: 'vehicles', table: this.vehicles },
      { name: 'shifts', table: this.shifts },
      { name: 'rides', table: this.rides },
      { name: 'maintenanceTickets', table: this.maintenanceTickets },
      { name: 'messages', table: this.messages },
      { name: 'bans', table: this.bans }
    ];

    for (const { name, table } of tables) {
      const conflicted = await (table as Table<OfflineDocument>)
        .filter(doc => doc._offline?.conflicted === true)
        .toArray();
      
      if (conflicted.length > 0) {
        conflicts.push({ collection: name, documents: conflicted });
      }
    }

    return conflicts;
  }

  async resolveConflict(collection: string, docId: string, resolution: 'local' | 'remote', remoteData?: any): Promise<void> {
    const table = (this as any)[collection] as Table<OfflineDocument>;
    if (!table) return;

    if (resolution === 'remote' && remoteData) {
      await table.update(docId, {
        ...remoteData,
        _offline: {
          id: docId,
          lastModified: new Date(),
          synced: true,
          conflicted: false
        }
      });
    } else {
      await table.update(docId, {
        '_offline.conflicted': false,
        '_offline.synced': false,
        '_offline.pendingOperation': 'update'
      });
      await this.addToSyncQueue(collection, docId, 'update');
    }
  }
}

// Create and export the database instance
export const offlineDb = new OfflineDatabase();

// Export types
export type { OfflineDatabase };