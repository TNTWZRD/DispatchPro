// src/lib/firebase-offline.ts
// This file provides a drop-in replacement for Firebase functions that work offline

import { OfflineDataLayer } from './offline-data-layer';
import { 
  serverTimestamp as firestoreServerTimestamp,
  Timestamp,
  type Query,
  type CollectionReference,
  type DocumentReference
} from 'firebase/firestore';

// Re-export original Firebase functions for compatibility
export { Timestamp } from 'firebase/firestore';
export { auth, app } from './firebase';

// Offline-aware versions of Firebase functions
export const db = {
  // This is not the actual Firestore database, but a wrapper
  _isOfflineWrapper: true
};

export function collection(collectionName: string) {
  return OfflineDataLayer.collection(collectionName);
}

export function doc(collectionName: string, docId?: string) {
  return OfflineDataLayer.doc(collectionName, docId || generateId());
}

export async function getDoc(collectionName: string, docId: string) {
  return await OfflineDataLayer.getDocument(collectionName, docId);
}

export async function setDoc(collectionName: string, docId: string, data: any, userId?: string) {
  return await OfflineDataLayer.setDocument(collectionName, docId, data, userId);
}

export async function updateDoc(collectionName: string, docId: string, data: any, userId?: string) {
  return await OfflineDataLayer.updateDocument(collectionName, docId, data, userId);
}

export async function deleteDoc(collectionName: string, docId: string, userId?: string) {
  return await OfflineDataLayer.deleteDocument(collectionName, docId, userId);
}

export function onSnapshot(
  collectionName: string,
  callback: (documents: any[]) => void,
  filters?: { field: string; operator: any; value: any }[],
  orderField?: string,
  orderDirection?: 'asc' | 'desc',
  limitCount?: number
) {
  return OfflineDataLayer.onSnapshot(
    collectionName,
    filters,
    orderField,
    orderDirection,
    limitCount,
    callback
  );
}

// Query builders for compatibility
export function query(collectionRef: any, ...constraints: any[]) {
  // This is a simplified query builder for offline compatibility
  // The actual filtering is handled in the offline data layer
  return {
    collectionName: collectionRef.name || collectionRef,
    constraints
  };
}

export function where(field: string, operator: any, value: any) {
  return { field, operator, value };
}

export function orderBy(field: string, direction?: 'asc' | 'desc') {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number) {
  return { type: 'limit', count };
}

// Helper function to generate IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Firebase compatibility functions
export function serverTimestamp() {
  return firestoreServerTimestamp();
}

// For backward compatibility with existing code
export const addDoc = async (collectionRef: any, data: any, userId?: string) => {
  const id = generateId();
  await setDoc(collectionRef.name || collectionRef, id, data, userId);
  return { id };
};

export const writeBatch = () => {
  const operations: Array<() => Promise<void>> = [];
  
  return {
    set: (docRef: any, data: any) => {
      operations.push(() => setDoc(docRef.collection, docRef.id, data));
    },
    update: (docRef: any, data: any) => {
      operations.push(() => updateDoc(docRef.collection, docRef.id, data));
    },
    delete: (docRef: any) => {
      operations.push(() => deleteDoc(docRef.collection, docRef.id));
    },
    commit: async () => {
      for (const operation of operations) {
        await operation();
      }
    }
  };
};

export const arrayUnion = (...elements: any[]) => {
  return { _arrayUnion: elements };
};

export const arrayRemove = (...elements: any[]) => {
  return { _arrayRemove: elements };
};

// Export types for compatibility
export type {
  Query,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';