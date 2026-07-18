import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_KEY = 'khudra-cart';
const CART_STORE_KEY = 'khudra-cart-store';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  unit: string;
  imageUrl: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  // The store all items in the cart belong to (single-store carts). Null when
  // the cart is empty / no store chosen yet.
  storeId: number | null;
  totalCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  updateQty: (id: number, qty: number) => void;
  removeItem: (id: number) => void;
  setStoreId: (id: number | null) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeId, setStoreIdState] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [stored, storedStore] = await Promise.all([
          AsyncStorage.getItem(CART_KEY),
          AsyncStorage.getItem(CART_STORE_KEY),
        ]);
        if (stored) setItems(JSON.parse(stored));
        if (storedStore) setStoreIdState(JSON.parse(storedStore));
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(CART_STORE_KEY, JSON.stringify(storeId));
  }, [storeId, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const updateQty = useCallback((id: number, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.id !== id);
      return prev.map((i) => (i.id === id ? { ...i, qty } : i));
    });
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const setStoreId = useCallback((id: number | null) => setStoreIdState(id), []);

  const clear = useCallback(() => {
    setItems([]);
    setStoreIdState(null);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    // Distinct product count (not summed qty) — with half-kilo steps a summed
    // count could be fractional (e.g. "1.5") which reads wrong on a badge.
    const totalCount = items.length;
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
    return { items, storeId, totalCount, subtotal, addItem, updateQty, removeItem, setStoreId, clear };
  }, [items, storeId, addItem, updateQty, removeItem, setStoreId, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
