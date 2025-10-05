// src/lib/offline-data-layer.ts

import { 
  collection as firestoreCollection, 
  doc as firestoreDoc, 
  getDoc as firestoreGetDoc, 
  setDoc as firestoreSetDoc, 
  updateDoc as firestoreUpdateDoc, 
  deleteDoc as firestoreDeleteDoc, 
  onSnapshot as firestoreOnSnapshot, 
  query as firestoreQuery, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  type DocumentReference,
  type Query,
  type Unsubscribe,
  type DocumentSnapshot,
  type QuerySnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { offlineDb, type OfflineDocument } from './offline-db';
import { networkMonitor } from './network-monitor';
import { v4 as uuidv4 } from 'uuid';

// Offline-aware versions of Firestore functions
export class OfflineDataLayer {
  // Document operations
  static async getDocument<T extends OfflineDocument>(
    collectionName: string, 
    docId: string
  ): Promise<T | null> {
    try {
      // Try local first
      const table = (offlineDb as any)[collectionName];
      if (table) {
        const localDoc = await table.get(docId);
        if (localDoc) {
          return localDoc;
        }
      }

      // If online and not found locally, try Firestore
      if (networkMonitor.getStatus()) {
        const docRef = firestoreDoc(db, collectionName, docId);
        const docSnap = await firestoreGetDoc(docRef);
        
        if (docSnap.exists()) {
          const data = this.convertFirestoreData(docSnap.data(), docId);
          
          // Store locally for future offline access
          if (table) {
            await table.put({
              ...data,
              _offline: {
                id: docId,
                lastModified: new Date(),
                synced: true
              }
            });
          }
          
          return data as T;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error getting document ${docId} from ${collectionName}:`, error);
      return null;
    }
  }

  static async setDocument<T extends OfflineDocument>(
    collectionName: string, 
    docId: string, 
    data: Omit<T, '_offline'>,
    userId?: string
  ): Promise<void> {
    const table = (offlineDb as any)[collectionName];
    const now = new Date();
    
    // Add to local database immediately
    const localData = {
      ...data,
      id: docId,
      createdAt: (data as any).createdAt || now,
      updatedAt: now,
      _offline: {
        id: docId,
        lastModified: now,
        synced: false,
        pendingOperation: 'create' as const
      }
    };
    
    if (table) {
      await table.put(localData);
    }

    // Add to sync queue
    await offlineDb.addToSyncQueue(collectionName, docId, 'create', localData, userId);

    // If online, try to sync immediately
    if (networkMonitor.getStatus()) {
      try {
        const docRef = firestoreDoc(db, collectionName, docId);
        const { _offline, ...cleanData } = localData;
        const firestoreData = this.prepareDataForFirestore(cleanData);
        
        await firestoreSetDoc(docRef, {
          ...firestoreData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Mark as synced
        if (table) {
          await table.update(docId, {
            '_offline.synced': true,
            '_offline.pendingOperation': undefined
          });
        }
        
        // Remove from sync queue
        await offlineDb.syncQueue.where('docId').equals(docId).delete();
        
      } catch (error) {
        console.error(`Failed to sync document ${docId} immediately:`, error);
        // Will be retried by sync manager
      }
    }
  }

  static async updateDocument<T extends OfflineDocument>(
    collectionName: string, 
    docId: string, 
    updates: Partial<Omit<T, '_offline'>>,
    userId?: string
  ): Promise<void> {
    const table = (offlineDb as any)[collectionName];
    const now = new Date();
    
    // Get existing document
    let existingDoc = null;
    if (table) {
      existingDoc = await table.get(docId);
    }

    // Merge updates with existing data
    const updatedData = {
      ...existingDoc,
      ...updates,
      id: docId,
      updatedAt: now,
      _offline: {
        ...existingDoc?._offline,
        id: docId,
        lastModified: now,
        synced: false,
        pendingOperation: 'update' as const
      }
    };
    
    if (table) {
      await table.put(updatedData);
    }

    // Add to sync queue
    await offlineDb.addToSyncQueue(collectionName, docId, 'update', updatedData, userId);

    // If online, try to sync immediately
    if (networkMonitor.getStatus()) {
      try {
        const docRef = firestoreDoc(db, collectionName, docId);
        const { _offline, ...cleanData } = updatedData;
        const firestoreData = this.prepareDataForFirestore(cleanData);
        
        await firestoreUpdateDoc(docRef, {
          ...firestoreData,
          updatedAt: serverTimestamp()
        });

        // Mark as synced
        if (table) {
          await table.update(docId, {
            '_offline.synced': true,
            '_offline.pendingOperation': undefined
          });
        }
        
        // Remove from sync queue
        await offlineDb.syncQueue.where('docId').equals(docId).delete();
        
      } catch (error) {
        console.error(`Failed to sync document update ${docId} immediately:`, error);
        // Will be retried by sync manager
      }
    }
  }

  static async deleteDocument(
    collectionName: string, 
    docId: string,
    userId?: string
  ): Promise<void> {
    const table = (offlineDb as any)[collectionName];
    
    // Mark as deleted locally (soft delete)
    if (table) {
      await table.update(docId, {
        '_offline.synced': false,
        '_offline.pendingOperation': 'delete',
        '_offline.lastModified': new Date()
      });
    }

    // Add to sync queue
    await offlineDb.addToSyncQueue(collectionName, docId, 'delete', null, userId);

    // If online, try to sync immediately
    if (networkMonitor.getStatus()) {
      try {
        const docRef = firestoreDoc(db, collectionName, docId);
        await firestoreDeleteDoc(docRef);

        // Remove from local database
        if (table) {
          await table.delete(docId);
        }
        
        // Remove from sync queue
        await offlineDb.syncQueue.where('docId').equals(docId).delete();
        
      } catch (error) {
        console.error(`Failed to sync document deletion ${docId} immediately:`, error);
        // Will be retried by sync manager
      }
    }
  }

  // Collection queries
  static async getCollection<T extends OfflineDocument>(
    collectionName: string,
    filters?: { field: string; operator: any; value: any }[],
    orderField?: string,
    orderDirection?: 'asc' | 'desc',
    limitCount?: number
  ): Promise<T[]> {
    const table = (offlineDb as any)[collectionName];
    
    if (!table) {
      return [];
    }

    try {
      // Start with all documents from local storage
      let query = table.toCollection();

      // Apply filters
      if (filters) {
        for (const filter of filters) {
          query = query.filter((doc: any) => {
            const value = doc[filter.field];
            switch (filter.operator) {
              case '==':
                return value === filter.value;
              case '!=':
                return value !== filter.value;
              case '<':
                return value < filter.value;
              case '<=':
                return value <= filter.value;
              case '>':
                return value > filter.value;
              case '>=':
                return value >= filter.value;
              case 'in':
                return Array.isArray(filter.value) && filter.value.includes(value);
              case 'array-contains':
                return Array.isArray(value) && value.includes(filter.value);
              default:
                return true;
            }
          });
        }
      }

      // Filter out soft-deleted documents
      query = query.filter((doc: any) => 
        !doc._offline?.pendingOperation || doc._offline.pendingOperation !== 'delete'
      );

      // Apply ordering
      if (orderField) {
        query = query.sortBy(orderField);
        if (orderDirection === 'desc') {
          query = query.reverse();
        }
      }

      // Apply limit
      if (limitCount) {
        query = query.limit(limitCount);
      }

      const results = await query.toArray();
      return results as T[];
      
    } catch (error) {
      console.error(`Error querying collection ${collectionName}:`, error);
      return [];
    }
  }

  // Real-time listeners (offline-aware)
  static onSnapshot<T extends OfflineDocument>(
    collectionName: string,
    filters?: { field: string; operator: any; value: any }[],
    orderField?: string,
    orderDirection?: 'asc' | 'desc',
    limitCount?: number,
    callback?: (documents: T[]) => void
  ): () => void {
    let firestoreUnsubscribe: Unsubscribe | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let lastLocalCheck = 0;

    const table = (offlineDb as any)[collectionName];

    // Local data check function
    const checkLocalData = async () => {
      try {
        const documents = await this.getCollection<T>(
          collectionName, 
          filters, 
          orderField, 
          orderDirection, 
          limitCount
        );
        
        if (callback) {
          callback(documents);
        }
      } catch (error) {
        console.error(`Error in local data check for ${collectionName}:`, error);
      }
    };

    // Set up Firestore listener if online
    const setupFirestoreListener = () => {
      if (!networkMonitor.getStatus()) {
        return;
      }

      try {
        let q: Query = firestoreCollection(db, collectionName);

        // Apply filters
        if (filters) {
          for (const filter of filters) {
            q = firestoreQuery(q, where(filter.field, filter.operator, filter.value));
          }
        }

        // Apply ordering
        if (orderField) {
          q = firestoreQuery(q, orderBy(orderField, orderDirection || 'asc'));
        }

        // Apply limit
        if (limitCount) {
          q = firestoreQuery(q, limit(limitCount));
        }

        firestoreUnsubscribe = firestoreOnSnapshot(q, 
          async (snapshot) => {
            // Update local storage with Firestore changes
            if (table) {
              const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...this.convertFirestoreData(doc.data(), doc.id),
                _offline: {
                  id: doc.id,
                  lastModified: new Date(),
                  synced: true
                }
              }));

              await offlineDb.bulkPutWithMetadata(table, docs, true);
            }

            // Trigger local data check to update UI
            await checkLocalData();
          },
          (error) => {
            console.error(`Firestore listener error for ${collectionName}:`, error);
          }
        );
      } catch (error) {
        console.error(`Failed to set up Firestore listener for ${collectionName}:`, error);
      }
    };

    // Network status change handler
    const handleNetworkChange = (isOnline: boolean) => {
      if (isOnline) {
        setupFirestoreListener();
      } else if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
      }
    };

    // Set up network listener
    const networkUnsubscribe = networkMonitor.addListener(handleNetworkChange);

    // Initial setup
    setupFirestoreListener();
    checkLocalData();

    // Set up periodic local checks for offline changes
    intervalId = setInterval(checkLocalData, 1000);

    // Return cleanup function
    return () => {
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      networkUnsubscribe();
    };
  }

  // Utility methods
  private static convertFirestoreData(data: any, id: string): any {
    const converted = { ...data, id };
    
    // Convert Firestore timestamps to dates
    Object.keys(converted).forEach(key => {
      if (converted[key] && typeof converted[key].toDate === 'function') {
        converted[key] = converted[key].toDate();
      }
    });
    
    return converted;
  }

  private static prepareDataForFirestore(data: any): any {
    const prepared = { ...data };
    
    // Convert Date objects to Firestore Timestamps
    Object.keys(prepared).forEach(key => {
      if (prepared[key] instanceof Date) {
        prepared[key] = Timestamp.fromDate(prepared[key]);
      }
    });
    
    return prepared;
  }

  // Convenience methods that match Firestore API
  static collection(name: string) {
    return {
      doc: (id?: string) => this.doc(name, id || uuidv4()),
      get: (filters?: any[], orderField?: string, orderDirection?: 'asc' | 'desc', limitCount?: number) => 
        this.getCollection(name, filters, orderField, orderDirection, limitCount),
      onSnapshot: (callback: (docs: any[]) => void, filters?: any[], orderField?: string, orderDirection?: 'asc' | 'desc', limitCount?: number) =>
        this.onSnapshot(name, filters, orderField, orderDirection, limitCount, callback)
    };
  }

  static doc(collectionName: string, docId: string) {
    return {
      get: () => this.getDocument(collectionName, docId),
      set: (data: any, userId?: string) => this.setDocument(collectionName, docId, data, userId),
      update: (data: any, userId?: string) => this.updateDocument(collectionName, docId, data, userId),
      delete: (userId?: string) => this.deleteDocument(collectionName, docId, userId),
      onSnapshot: (callback: (doc: any) => void) => {
        return this.onSnapshot(collectionName, [{ field: 'id', operator: '==', value: docId }], undefined, undefined, 1, (docs) => {
          callback(docs[0] || null);
        });
      }
    };
  }
}

// Export convenience functions that match the Firestore API
export const collection = OfflineDataLayer.collection.bind(OfflineDataLayer);
export const doc = OfflineDataLayer.doc.bind(OfflineDataLayer);
export const getDoc = OfflineDataLayer.getDocument.bind(OfflineDataLayer);
export const setDoc = OfflineDataLayer.setDocument.bind(OfflineDataLayer);
export const updateDoc = OfflineDataLayer.updateDocument.bind(OfflineDataLayer);
export const deleteDoc = OfflineDataLayer.deleteDocument.bind(OfflineDataLayer);
export const onSnapshot = OfflineDataLayer.onSnapshot.bind(OfflineDataLayer);

// Legacy Firebase functions for compatibility (will work offline)
export { serverTimestamp } from 'firebase/firestore';