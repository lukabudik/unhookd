// Firebase Cloud Messaging service worker — handles background push notifications.
// Config is hardcoded here (safe: these are client-side public keys).

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCFfp9kEqsKPECWdn3lslusNAJ79J5UqjA',
  authDomain: 'unhookd-5eb77.firebaseapp.com',
  projectId: 'unhookd-5eb77',
  storageBucket: 'unhookd-5eb77.firebasestorage.app',
  messagingSenderId: '502754967063',
  appId: '1:502754967063:web:f44a0e76a1f0011a802652',
})

const messaging = firebase.messaging()

// Background push notifications (app closed / not focused)
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

// Notification click — focus or open the app
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

// In-app notification trigger (app open, sent via postMessage from useNotifications)
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
