
// DispatchPro Offline-First Service Worker
// This service worker provides comprehensive offline support with caching strategies

const CACHE_NAME = 'dispatchpro-v1';
const DYNAMIC_CACHE_NAME = 'dispatchpro-dynamic-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  // Core app routes
  '/login',
  '/admin',
  '/driver',
  // Static assets will be handled by Next.js
];

// Assets that should be cached on first request
const CACHE_ON_REQUEST = [
  // API routes
  /^\/api\//,
  // Static assets
  /\/_next\/static\//,
  /\/images\//,
  // External resources
  /^https:\/\/fonts\./,
  /^https:\/\/www\.gstatic\.com/
];

// Assets that should always be fetched fresh when online
const NETWORK_FIRST = [
  // Real-time data
  /firestore\.googleapis\.com/,
  // Authentication
  /firebase\.googleapis\.com\/auth/,
  // API calls
  /^\/api\/(?!static)/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http protocols
  if (!request.url.startsWith('http')) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Network-first strategy for real-time data
    if (NETWORK_FIRST.some(pattern => pattern.test(request.url))) {
      return await networkFirst(request);
    }

    // Cache-first strategy for static assets
    if (CACHE_ON_REQUEST.some(pattern => pattern.test(request.url))) {
      return await cacheFirst(request);
    }

    // Stale-while-revalidate for app pages
    return await staleWhileRevalidate(request);
    
  } catch (error) {
    console.error('[SW] Request failed:', error);
    
    // Try to serve from cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request and we're offline, serve the app shell
    if (request.destination === 'document') {
      const appShell = await caches.match('/');
      if (appShell) {
        return appShell;
      }
    }
    
    // Last resort - show offline page
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This content is not available offline'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Network-first: Try network, fallback to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Cache-first: Try cache, fallback to network
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Stale-while-revalidate: Serve from cache, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh version in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.warn('[SW] Background fetch failed:', error);
    });
  
  // Return cached version immediately, or wait for network if no cache
  return cachedResponse || fetchPromise;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'dispatch-sync') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  try {
    // This would trigger the sync manager in the app
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'SYNC_OFFLINE_DATA'
      });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Handle push notifications (Firebase messaging)
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  console.log('[SW] Push notification received:', payload);

  const notificationTitle = payload.notification?.title || 'DispatchPro';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        // If app is already open, focus it
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise, open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'REGISTER_BACKGROUND_SYNC') {
    self.registration.sync.register('dispatch-sync');
  }
});

console.log('[SW] Service worker script loaded');
