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
import {
  useRequestOtp,
  useVerifyOtp,
  useGetMe,
  useUpdateMe,
} from '@workspace/api-client-react';
import { queryClient } from '@/lib/query-client';
import { setCustomerSessionToken } from '@/lib/session';

const TOKEN_KEY = 'khudra-customer-token';

interface CustomerProfile {
  phone: string;
  name?: string | null;
  avatarUrl?: string | null;
  points: number;
  walletBalance?: number;
  hasProfile: boolean;
}

interface AuthContextValue {
  token: string | null;
  customer: CustomerProfile | null;
  isReady: boolean;
  isAuthenticated: boolean;
  requestOtp: (phone: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (
    phone: string,
    code: string,
  ) => Promise<{ ok: boolean; error?: string; hasProfile?: boolean }>;
  updateProfile: (data: {
    name?: string;
    avatarUrl?: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setCustomerSessionToken(token);
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored) setToken(stored);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const meQuery = useGetMe({
    query: { enabled: !!token, retry: false } as any,
  });

  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();
  const updateMeMutation = useUpdateMe();

  const requestOtp = useCallback(
    async (phone: string) => {
      try {
        await requestOtpMutation.mutateAsync({ data: { phone } });
        return { ok: true };
      } catch (err: any) {
        const message =
          err?.data?.error ?? err?.message ?? 'تعذر إرسال رمز التحقق';
        return { ok: false, error: message };
      }
    },
    [requestOtpMutation],
  );

  const verifyOtp = useCallback(
    async (phone: string, code: string) => {
      try {
        const res = await verifyOtpMutation.mutateAsync({
          data: { phone, code },
        });
        setToken(res.token);
        await AsyncStorage.setItem(TOKEN_KEY, res.token);
        queryClient.invalidateQueries();
        return { ok: true, hasProfile: !!res.customer?.hasProfile };
      } catch (err: any) {
        const message = err?.data?.error ?? err?.message ?? 'رمز التحقق غير صحيح';
        return { ok: false, error: message };
      }
    },
    [verifyOtpMutation],
  );

  const updateProfile = useCallback(
    async (data: { name?: string; avatarUrl?: string | null }) => {
      try {
        await updateMeMutation.mutateAsync({ data });
        queryClient.invalidateQueries();
        return { ok: true };
      } catch (err: any) {
        const message = err?.data?.error ?? err?.message ?? 'تعذر تحديث الملف الشخصي';
        return { ok: false, error: message };
      }
    },
    [updateMeMutation],
  );

  const logout = useCallback(() => {
    setToken(null);
    AsyncStorage.removeItem(TOKEN_KEY);
    queryClient.clear();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      customer: token && meQuery.data ? (meQuery.data as CustomerProfile) : null,
      isReady,
      isAuthenticated: !!token && !!meQuery.data,
      requestOtp,
      verifyOtp,
      updateProfile,
      logout,
    }),
    [token, meQuery.data, isReady, requestOtp, verifyOtp, updateProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
