# DispatchPro Offline Integration Guide

## Overview

DispatchPro now supports full offline functionality with automatic synchronization when connectivity is restored. This guide covers how to integrate the offline features into your existing application.

## Key Features Implemented

- **Offline-First Data Layer**: All data operations work offline and sync when online
- **Intelligent Sync**: Automatic conflict resolution with manual override options
- **Network Status Monitoring**: Real-time connectivity detection
- **Visual Indicators**: Clear UI feedback for offline status and sync progress
- **Service Worker Caching**: App resources cached for offline use
- **Persistent Authentication**: User sessions maintained offline

## Installation Steps

### 1. Install Dependencies

```bash
npm install dexie uuid @types/uuid
```

### 2. Update Your Layout Component

Replace your existing layout.tsx with offline-aware providers:

```tsx
// src/app/layout.tsx
import { OfflineProvider, OfflineAuthProvider } from '@/lib/offline-integration'
import { FloatingOfflineIndicator } from '@/components/offline-indicator'
import { ConflictResolutionDialog } from '@/components/conflict-resolution-dialog'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OfflineAuthProvider>
          <OfflineProvider>
            {children}
            <FloatingOfflineIndicator />
            <ConflictResolutionDialog />
          </OfflineProvider>
        </OfflineAuthProvider>
      </body>
    </html>
  )
}
```

### 3. Initialize Offline Support

Add to your main app component or layout:

```tsx
// In your main app component
import { initializeOfflineSupport } from '@/lib/offline-integration'

export default function App() {
  useEffect(() => {
    initializeOfflineSupport().catch(console.error)
  }, [])
  
  // ... rest of your component
}
```

### 4. Update Firebase Imports

Replace existing Firebase imports with offline-aware versions:

```tsx
// Before
import { db } from '@/lib/firebase'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'

// After
import { collection, doc, onSnapshot, updateDoc } from '@/lib/firebase-offline'
```

### 5. Update Data Access Patterns

The offline data layer maintains the same API as Firestore:

```tsx
// This code works both online and offline
const unsubscribe = onSnapshot('rides', (rides) => {
  setRides(rides)
}, [
  { field: 'status', operator: 'in', value: ['pending', 'assigned'] }
])

// Updates work offline and sync when online
await updateDoc('rides', rideId, {
  status: 'completed',
  completionTime: new Date()
})
```

## Component Integration Examples

### Adding Network Status to Header

```tsx
import { HeaderOfflineIndicator } from '@/components/offline-indicator'

export function MainHeader() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>DispatchPro</h1>
      <div className="flex items-center gap-4">
        <HeaderOfflineIndicator />
        {/* other header items */}
      </div>
    </header>
  )
}
```

### Using Offline Hooks

```tsx
import { useNetworkState, useSyncState } from '@/lib/offline-integration'

export function Dashboard() {
  const { isOnline, forceNetworkCheck } = useNetworkState()
  const { syncStatus, pendingSyncCount } = useSyncState()
  
  return (
    <div>
      {!isOnline && (
        <div className="bg-yellow-100 p-2 text-center">
          Working offline - changes will sync when connected
        </div>
      )}
      
      {pendingSyncCount > 0 && (
        <div className="bg-blue-100 p-2 text-center">
          {pendingSyncCount} changes pending sync
        </div>
      )}
      
      {/* rest of dashboard */}
    </div>
  )
}
```

## Migration Strategy

### Immediate Benefits (No Code Changes Required)
- Automatic caching of app resources
- Network status monitoring
- Basic offline authentication persistence

### Gradual Migration (Component by Component)
1. Update Firebase imports to use offline-aware versions
2. Add offline indicators to key components
3. Test offline functionality in each area
4. Handle edge cases and conflicts

### Data Migration
The offline system automatically syncs existing Firestore data. No manual migration needed.

## Configuration Options

### Sync Behavior
```tsx
// Force immediate sync
import { syncManager } from '@/lib/sync-manager'
await syncManager.forceSync()

// Handle conflicts programmatically
import { useConflicts } from '@/lib/offline-integration'
const { conflicts, resolveConflict } = useConflicts()
await resolveConflict(collection, docId, 'local') // or 'remote'
```

### Network Policies
```tsx
// Check connectivity manually
import { networkMonitor } from '@/lib/network-monitor'
const isOnline = await networkMonitor.forceCheck()

// Listen for network changes
const unsubscribe = networkMonitor.addListener((isOnline) => {
  console.log('Network status:', isOnline ? 'online' : 'offline')
})
```

## Testing Offline Functionality

### Browser DevTools
1. Open DevTools → Network tab
2. Check "Offline" to simulate network failure
3. Test app functionality - should work normally
4. Uncheck "Offline" to see automatic sync

### Key Test Scenarios
- [ ] Create/update/delete operations while offline
- [ ] Authentication persistence across offline periods
- [ ] Conflict resolution when multiple devices edit same data
- [ ] Service worker caching of app resources
- [ ] Sync progress indicators
- [ ] Error handling for failed syncs

## Performance Considerations

### Storage Limits
- IndexedDB typically allows 50MB+ per origin
- Monitor storage usage in production
- Consider data archiving for long-running apps

### Sync Optimization
- Batch operations are automatically optimized
- Sync occurs every 30 seconds when online
- Background sync triggers on network reconnection

### Battery Impact
- Network monitoring is lightweight
- Sync only occurs when necessary
- Background operations are minimized

## Troubleshooting

### Common Issues

**Service Worker Not Registering**
- Check console for registration errors
- Ensure HTTPS in production
- Clear browser cache if needed

**Data Not Syncing**
- Check network connectivity
- Look for conflict resolution dialogs
- Monitor sync status indicators

**Authentication Issues Offline**
- Verify offline session validation
- Check local storage for auth data
- Test session expiry handling

### Debug Tools
```tsx
import { getOfflineStats } from '@/lib/offline-integration'

// Get comprehensive offline status
const stats = await getOfflineStats()
console.log('Offline stats:', stats)
```

## Security Considerations

- Offline data is stored in browser's IndexedDB (client-side only)
- Authentication tokens have limited offline validity (7 days default)
- Sensitive operations still require online verification
- Service worker caches are isolated per origin

## Next Steps

1. Deploy the offline-enabled version
2. Monitor user feedback and error rates
3. Optimize sync patterns based on usage
4. Consider advanced features like selective sync
5. Implement offline analytics and diagnostics

## Support

For issues or questions about the offline implementation:
- Check browser console for detailed error logs
- Use the offline stats API for diagnostics
- Test in multiple browsers and network conditions