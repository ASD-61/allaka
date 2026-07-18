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
import { useAdminLogin, useAdminLogout } from '@workspace/api-client-react';
import { queryClient } from '@/lib/query-client';

const ADMIN_TOKEN_KEY = 'khudra-admin-token';

interface AdminContextValue {
  token: string | null;
  isAdmin: boolean;
  isReady: boolean;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
        if (stored) setToken(stored);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const loginMutation = useAdminLogin();
  const logoutMutation = useAdminLogout();

  const login = useCallback(
    async (password: string) => {
      try {
        const res = await loginMutation.mutateAsync({ data: { password } });
        if (res.token) {
          setToken(res.token);
          await AsyncStorage.setItem(ADMIN_TOKEN_KEY, res.token);
        }
        return { ok: true };
      } catch (err: any) {
        const message = err?.data?.error ?? err?.message ?? 'كلمة المرور غير صحيحة';
        return { ok: false, error: message };
      }
    },
    [loginMutation],
  );

  const logout = useCallback(() => {
    setToken(null);
    AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    logoutMutation.mutate();
    queryClient.invalidateQueries();
  }, [logoutMutation]);

  const value = useMemo<AdminContextValue>(
    () => ({ token, isAdmin: !!token, isReady, login, logout }),
    [token, isReady, login, logout],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminAuth(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdminAuth must be used within an AdminProvider');
  return context;
}
