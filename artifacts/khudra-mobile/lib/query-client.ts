import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

// Shared singleton so contexts (auth/admin) can invalidate/clear queries
// from outside the component tree that owns the QueryClientProvider.
// Every query auto-refetches every 3s while the app is in the foreground,
// so admin changes (new orders, products, availability toggles) appear on
// customer devices within ~3 seconds without a manual refresh.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 3_000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    },
  },
});

// On native, React Query can't detect "focus" by itself — wire it to
// AppState so bringing the app back to the foreground refetches immediately.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
}
