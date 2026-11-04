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

const VAPID_KEY = 'BAh0tVkaffNfH5WqnZ8MtxGmHQvfnl7GiIoDtCtAApLhjKtwla1ETtCihfD0HJ3oJg0lyeH-01mpyY-eQ59IMqs';

/** True only where web push can actually work (hides iOS Safari tabs, native WebViews, etc.). */
export async function isPushSupported(): Promise<boolean> {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    return await isSupported();
  } catch {
    return false;
  }
}

export const isInIframe = () => {
  try { return window.top !== window.self; } catch { return true; }
};

async function getDeviceToken(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  return (await getToken(messaging, { serviceWorkerRegistration: registration, vapidKey: VAPID_KEY })) || null;
}

interface SaunaRef { id: string; lat: number; lon: number }

/** Is this device already subscribed to this sauna? Never prompts for permission. */
export async function getLightningAlertStatus(loc: SaunaRef): Promise<boolean> {
  if (Notification.permission !== 'granted') return false;
  const token = await getDeviceToken();
  if (!token) return false;
  const { data } = await supabase.functions.invoke('register-push-token', {
    body: { token, location_id: loc.id, action: 'status' },
  });
  return !!data?.subscribed;
}

export type SubscribeResult = 'subscribed' | 'denied' | 'open-in-new-tab' | 'failed';

/** Call from a click handler only. */
export async function subscribeLightningAlerts(loc: SaunaRef): Promise<SubscribeResult> {
  if (isInIframe()) return 'open-in-new-tab';
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  try {
    const token = await getDeviceToken();
    if (!token) return 'failed';
    const { error } = await supabase.functions.invoke('register-push-token', {
      body: { token, location_id: loc.id, lat: loc.lat, lon: loc.lon, action: 'subscribe' },
    });
    return error ? 'failed' : 'subscribed';
  } catch (e) {
    console.error('Push subscribe error:', e);
    return 'failed';
  }
}

export async function unsubscribeLightningAlerts(loc: SaunaRef): Promise<boolean> {
  const token = await getDeviceToken();
  if (!token) return true;
  const { error } = await supabase.functions.invoke('register-push-token', {
    body: { token, location_id: loc.id, action: 'unsubscribe' },
  });
  return !error;
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
