// Firebase Cloud Messaging service worker
// This handles background push notifications via FCM.
// It is loaded automatically by Firebase SDK when you call getToken().
//
// To activate: fill in NEXT_PUBLIC_FIREBASE_* env vars and VAPID key.

importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js')

// Config is injected at registration time via a message from the app,
// or we use self.__FIREBASE_CONFIG if the app sets it before registration.
// Firebase config is injected at registration time by the app via self.__FIREBASE_CONFIG.
// To use this SW, set NEXT_PUBLIC_FIREBASE_* environment variables and update your
// Firebase project credentials in src/lib/firebase.ts and this file.
const firebaseConfig = self.__FIREBASE_CONFIG || {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

// Only initialize if we have real credentials
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== '') {
  firebase.initializeApp(firebaseConfig)

  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || 'Unhookd'
    const notificationOptions = {
      body: payload.notification?.body || "Time to check in — how are you doing?",
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'unhookd-reminder',
      data: payload.data,
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
  })
}

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
