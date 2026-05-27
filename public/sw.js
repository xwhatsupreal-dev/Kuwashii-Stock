// Service Worker for Stock Alerts (SW.JS)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener for background actions
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Listener for push notifications (if using push payloads)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { text: event.data.text() };
    }
  }

  const title = data.title || 'อัปเดตสต็อกสินค้า 🔔';
  const options = {
    body: data.body || data.text || 'มีการแจ้งเตือนใหม่จากระบบคลังสินค้า!',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'aotr-stock-alert',
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
