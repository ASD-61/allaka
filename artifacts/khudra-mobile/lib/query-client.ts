import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// How long persisted cache stays valid on disk (also the query gcTime, which
// MUST be >= this or entries would be garbage-collected before restore).
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

// Treat a request as "not worth retrying" for client errors — retrying a 401
// (bad token) or 400/404 just wastes time and can cause spinners.
function isNonRetryableStatus(status: unknown): boolean {
  return status === 400 || status === 401 || status === 403 || status === 404;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep serving cached data instantly; refresh in the background.
      staleTime: 30_000,
      gcTime: CACHE_MAX_AGE,
      // offlineFirst: when there's no connection, resolve from cache instead of
      // hanging in a perpetual "loading" state. When back online, refetch.
      networkMode: 'offlineFirst',
      // Poll for fresh data every 3s ONLY while online — never pile up failing
      // requests while offline (which caused infinite spinners before).
      refetchInterval: () => (onlineManager.isOnline() ? 3_000 : false),
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      // Don't refetch on remount when offline (show cache immediately).
      refetchOnReconnect: true,
      retry: (count: number, err: any) => {
        if (isNonRetryableStatus(err?.status)) return false;
        if (!onlineManager.isOnline()) return false;
        return count < 2;
      },
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Persist the whole query cache to the phone's permanent storage so previously
// visited stores/products show up instantly on next launch — even with no
// internet at all.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'khudra-rq-cache-v1',
  throttleTime: 1_500,
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: CACHE_MAX_AGE,
  dehydrateOptions: {
    // Only persist successful queries (don't cache errors/pending states).
    shouldDehydrateQuery: (query: { state: { status: string } }) =>
      query.state.status === 'success',
  },
} as const;

// --- Network + focus wiring -------------------------------------------------
if (Platform.OS !== 'web') {
  // Bring React Query's online state from the real device connectivity, so it
  // pauses network work when offline and resumes (refetches) when back online.
  onlineManager.setEventListener((setOnline) => {
    const sub = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setOnline(online);
    });
    return sub;
  });

  // Refetch immediately when the app returns to the foreground.
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
}
