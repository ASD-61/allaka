import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useListNotifications } from '@workspace/api-client-react';
import { useAuth } from '@/context/auth-context';

// Show alerts even while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Watches the customer's notification feed (polled every 3s by React Query)
 * and fires a local device notification whenever a NEW item appears —
 * broadcasts from the admin or order status updates.
 *
 * Note: these are local notifications, so they appear while the app is open
 * (foreground) or recently backgrounded. True remote push requires a
 * standalone build — not supported inside Expo Go.
 */
export function NotificationWatcher() {
  const { customer } = useAuth();
  const query = useListNotifications({
    query: { enabled: !!customer },
  } as any);

  // null = first load not processed yet (don't notify for historical items).
  const seenIds = useRef<Set<string> | null>(null);

  // Ask for permission once the customer is logged in.
  useEffect(() => {
    if (!customer || Platform.OS === 'web') return;
    Notifications.requestPermissionsAsync().catch(() => {});
  }, [customer]);

  // Reset the seen-set when the customer logs out/switches.
  useEffect(() => {
    if (!customer) seenIds.current = null;
  }, [customer]);

  useEffect(() => {
    if (!customer || Platform.OS === 'web') return;
    const items = query.data;
    if (!items) return;

    if (seenIds.current === null) {
      // First successful load: mark everything as already seen.
      seenIds.current = new Set(items.map((n) => n.id));
      return;
    }

    const fresh = items.filter((n) => !seenIds.current!.has(n.id));
    if (fresh.length === 0) return;
    for (const n of fresh) {
      seenIds.current.add(n.id);
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'عـلاّكـة 🥬',
          body: n.message,
          sound: true,
        },
        trigger: null, // fire immediately
      }).catch(() => {});
    }
  }, [customer, query.data]);

  return null;
}
