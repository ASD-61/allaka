import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Store } from '@workspace/api-client-react';

const STORE_KEY = 'khudra-selected-store';

interface StoreContextValue {
  // The store the customer is currently shopping. In a multi-vendor
  // marketplace each store is browsed on its own.
  selectedStore: Store | null;
  hydrated: boolean;
  setSelectedStore: (store: Store | null) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [selectedStore, setSelectedStoreState] = useState<Store | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORE_KEY);
        if (stored) setSelectedStoreState(JSON.parse(stored));
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setSelectedStore = useCallback((store: Store | null) => {
    setSelectedStoreState(store);
    if (store) {
      AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
    } else {
      AsyncStorage.removeItem(STORE_KEY);
    }
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({ selectedStore, hydrated, setSelectedStore }),
    [selectedStore, hydrated, setSelectedStore],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
