// Service worker: offline caching + notification delivery.
// FCM push is handled via the standard Web Push 'push' event — no Firebase
// SDK needed here. importScripts from external CDNs breaks Safari on iOS.

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

// FCM background push — standard Web Push API, no Firebase SDK required.
// FCM payload: { notification: { title, body }, data: { url, tag } }
self.addEventListener('push', (event) => {
  let title = 'Unhookd'
  let body = 'Time to check in.'
  let url = '/'
  let tag = 'unhookd-reminder'

  if (event.data) {
    try {
      const d = event.data.json()
      title = d.notification?.title || d.title || title
      body = d.notification?.body || d.body || body
      url = d.data?.url || d.url || url
      tag = d.data?.tag || d.tag || tag
    } catch {
      body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      renotify: true,
      data: { url },
    })
  )
})

// Notification click — focus existing tab or open new one
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

// In-app notification trigger (postMessage from useNotifications hook)
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
