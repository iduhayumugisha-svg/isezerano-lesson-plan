// =========================================================================
// Firebase Cloud Messaging (FCM) Service Worker for ISEZERANO ONLINE
// Runs in the background to deliver breaking news & announcement alerts
// to subscriber devices without requiring user login.
// =========================================================================

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker using canonical credentials
firebase.initializeApp({
  apiKey: "AIzaSyBJToe1yvQJ8ZRRXn6xwOYxh8wZOa4HO0c",
  authDomain: "isezerano-news.firebaseapp.com",
  projectId: "isezerano-news",
  storageBucket: "isezerano-news.firebasestorage.app",
  messagingSenderId: "37703708100",
  appId: "1:37703708100:web:4e59c508899434b8b74891"
});

const messaging = firebase.messaging();

// 1. Handle FCM Background Messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message received:', payload);

  const title = payload.notification?.title || payload.data?.title || 'ISEZERANO ONLINE';
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'Amakuru mashya yashyizwe kuri ISEZERANO ONLINE.';
  const noticeId = payload.data?.noticeId || payload.data?.id || 'notice_' + Date.now();
  const targetUrl = payload.data?.url || '/?notice=' + noticeId;

  const options = {
    body: body,
    image: payload.notification?.image || payload.data?.image || undefined,
    data: {
      url: targetUrl,
      noticeId: noticeId,
      requiresAuth: false
    },
    tag: noticeId, // Prevent duplicate pop-ups
    renotify: true,
    requireInteraction: true,
    vibrate: [250, 100, 250, 100, 250],
    actions: [
      { action: 'open_notice', title: 'Soma (Open)' }
    ]
  };

  return self.registration.showNotification(title, options);
});

// 2. Handle standard Web Push events for direct browser pushes
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('[FCM SW] Push event received JSON:', data);

    const title = data.notification?.title || data.title || 'ISEZERANO ONLINE';
    const body = data.notification?.body || data.body || data.message || 'Amakuru mashya yageze kuri ISEZERANO ONLINE.';
    const noticeId = data.data?.noticeId || data.noticeId || data.id || 'notice_' + Date.now();
    const targetUrl = data.data?.url || data.url || '/?notice=' + noticeId;

    const options = {
      body: body,
      data: {
        url: targetUrl,
        noticeId: noticeId,
        requiresAuth: false
      },
      tag: noticeId,
      renotify: true,
      requireInteraction: true,
      vibrate: [250, 100, 250, 100, 250]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // Plaintext push fallback
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('ISEZERANO ONLINE', {
        body: text,
        data: { url: '/', requiresAuth: false },
        requireInteraction: true
      })
    );
  }
});

// 3. Handle Notification Click (Open website directly to public announcement/news)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const noticeData = event.notification.data || {};
  const targetUrl = noticeData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 4. Handle client messages (e.g. Test push notification trigger)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_TEST_NOTIFICATION') {
    const { title, body, noticeId } = event.data;
    self.registration.showNotification(title || 'ISEZERANO ONLINE', {
      body: body || 'Igerageza ry\'itangazo ryoherejwe neza kuri iki gikoresho.',
      data: {
        url: '/?notice=' + (noticeId || 'test'),
        noticeId: noticeId || 'test',
        requiresAuth: false
      },
      vibrate: [200, 100, 200],
      requireInteraction: true
    });
  }
});
