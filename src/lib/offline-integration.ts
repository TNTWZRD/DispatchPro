// src/lib/offline-integration.ts
// Integration layer to initialize and manage offline functionality

import { OfflineProvider } from '@/context/offline-context'
import { OfflineAuthProvider } from '@/context/offline-auth-context'
import { offlineDb } from './offline-db'
import { networkMonitor } from './network-monitor'
import { syncManager } from './sync-manager'

// Initialize offline functionality
export async function initializeOfflineSupport() {
  try {
    console.log('🚀 Initializing offline support...')
    
    // Initialize IndexedDB
    await offlineDb.open()
    console.log('✅ Offline database initialized')
    
    // Initialize network monitoring
    const isOnline = networkMonitor.getStatus()
    console.log(`📡 Network status: ${isOnline ? 'Online' : 'Offline'}`)
    
    // Start sync manager if online
    if (isOnline) {
      await syncManager.performFullSync()
      console.log('🔄 Initial sync completed')
    }
    
    // Register service worker for offline caching
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        console.log('👷 Service worker registered:', registration)
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'BACKGROUND_SYNC') {
            syncManager.performFullSync()
          }
        })
      } catch (error) {
        console.warn('⚠️ Service worker registration failed:', error)
      }
    }
    
    console.log('✅ Offline support initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize offline support:', error)
    throw error
  }
}

// Migration helper to convert existing Firebase data to offline format
export async function migrateToOfflineFormat() {
  console.log('🔄 Starting offline migration...')
  
  try {
    // This would be called once to migrate existing data
    // Implementation depends on your current data structure
    console.log('✅ Migration completed')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Utility to check if app is running in offline mode
export function isOfflineMode(): boolean {
  return !networkMonitor.getStatus()
}

// Utility to get offline statistics
export async function getOfflineStats() {
  const networkStatus = await offlineDb.getNetworkStatus()
  const pendingItems = await offlineDb.getPendingSyncItems()
  const conflicts = syncManager.getConflicts()
  
  return {
    isOnline: networkStatus.isOnline,
    lastOnline: networkStatus.lastOnline,
    lastSync: networkStatus.lastSync,
    pendingSyncCount: pendingItems.length,
    conflictCount: conflicts.length,
    syncStatus: syncManager.getStatus()
  }
}

// Export providers for easy setup
export { OfflineProvider, OfflineAuthProvider }

// Re-export hooks for convenience
export { useOffline, useNetworkState, useSyncState, useConflicts } from '@/context/offline-context'
export { useOfflineAuth as useAuth } from '@/context/offline-auth-context'

// Export components
export { OfflineIndicator, FloatingOfflineIndicator, HeaderOfflineIndicator } from '@/components/offline-indicator'
export { ConflictResolutionDialog } from '@/components/conflict-resolution-dialog'