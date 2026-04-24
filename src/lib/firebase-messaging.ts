import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

const firebaseConfig = {
  apiKey: "AIzaSyAbgzfwQ3x0WhXtRvY5LABLPhl8sZDOOZA",
  authDomain: "cromane-weather.firebaseapp.com",
  projectId: "cromane-weather",
  storageBucket: "cromane-weather.firebasestorage.app",
  messagingSenderId: "594882967502",
  appId: "1:594882967502:web:9c7a49e8bf94d64c591d9f",
  measurementId: "G-D2R80M3VGW",
};

const app = initializeApp(firebaseConfig);

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

async function getMessagingInstance() {
  if (!(await isSupported())) {
    return null;
  }

  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }

  return messagingInstance;
}

/**
 * Request notification permission, get FCM token, and register it with our backend.
 * Returns the token string or null if denied/unsupported.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log('Push notifications not supported in this browser');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service worker registered:', registration.scope);

    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.log('Push notifications not supported in this browser');
      return null;
    }
    
    // Get FCM token — you may need to add a VAPID key here
    // For now, try without (works for some Firebase projects)
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: 'BAh0tVkaffNfH5WqnZ8MtxGmHQvfnl7GiIoDtCtAApLhjKtwla1ETtCihfD0HJ3oJg0lyeH-01mpyY-eQ59IMqs',
    });

    if (!token) {
      console.warn('No FCM token received');
      return null;
    }

    console.log('FCM token obtained:', token.substring(0, 20) + '...');

    // Register token with our backend
    const { error } = await supabase.functions.invoke('register-push-token', {
      body: { token },
    });

    if (error) {
      console.error('Failed to register push token:', error);
    } else {
      console.log('✅ Push token registered with backend');
    }

    return token;
  } catch (error) {
    console.error('Push registration error:', error);
    return null;
  }
}

/**
 * Listen for foreground messages and show a toast/notification.
 */
export async function onForegroundMessage(callback: (payload: { title: string; body: string }) => void) {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      return undefined;
    }

    return onMessage(messaging, (payload) => {
      console.log('Foreground message:', payload);
      callback({
        title: payload.notification?.title || '⚡ Irish Saunas',
        body: payload.notification?.body || 'Weather alert.',
      });
    });
  } catch (e) {
    console.error('Foreground message listener error:', e);
    return undefined;
  }
}
