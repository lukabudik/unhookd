const CACHE_NAME = 'unhookd-v2'

const APP_SHELL = [
  '/',
  '/log',
  '/history',
  '/plan',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/') || fetch(event.request)
      )
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const cloned = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned))
        return response
      })
    })
  )
})

// Handle incoming push messages (from FCM or Web Push)
self.addEventListener('push', (event) => {
  let data = { title: 'Unhookd', body: "Time to check in — how are you doing today?" }

  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Unhookd', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'unhookd-reminder',
      renotify: true,
      data: { url: data.url || '/' },
    })
  )
})

// Handle notification clicks
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

// Handle messages from the app (e.g., schedule a reminder)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = event.data
    self.registration.showNotification(title || 'Unhookd', {
      body: body || "Time to check in on your taper.",
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'unhookd-reminder',
      renotify: true,
      data: { url: url || '/' },
    })
  }
})
