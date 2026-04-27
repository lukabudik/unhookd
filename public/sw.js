// Unified service worker: caching + FCM background push in one file.
// Having two SWs at the same scope ('/') means only one can be active at a time.
// Merging them here ensures background push actually fires when the app is closed.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

// ── Firebase Cloud Messaging (background push) ─────────────────────────────

firebase.initializeApp({
  apiKey: 'AIzaSyCFfp9kEqsKPECWdn3lslusNAJ79J5UqjA',
  authDomain: 'unhookd-5eb77.firebaseapp.com',
  projectId: 'unhookd-5eb77',
  storageBucket: 'unhookd-5eb77.firebasestorage.app',
  messagingSenderId: '502754967063',
  appId: '1:502754967063:web:f44a0e76a1f0011a802652',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Unhookd'
  const body = payload.notification?.body || 'Time to check in.'
  const url = payload.data?.url || '/'

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.tag || 'unhookd',
    renotify: true,
    data: { url },
  })
})

// ── Caching ────────────────────────────────────────────────────────────────

const CACHE_NAME = 'unhookd-v3'

const APP_SHELL = ['/', '/history', '/plan', '/settings', '/insights']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/') || fetch(event.request)))
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response
        const cloned = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned))
        return response
      })
    })
  )
})

// ── Notification click (deep link) ────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

// ── In-app notification trigger (postMessage from useNotifications) ────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, tag } = event.data
    self.registration.showNotification(title || 'Unhookd', {
      body: body || 'Time to check in.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'unhookd-reminder',
      renotify: true,
      data: { url: url || '/' },
    })
  }
})
