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
import { getCurrentPositionSafe } from '@/lib/location';

const TOKEN_KEY = 'khudra-customer-token';
// The last successfully fetched profile is cached here so the app stays logged
// in and usable offline (or when /me fails due to a flaky network). We ONLY
// clear it on a real 401 from the server — never on a network error.
const PROFILE_KEY = 'khudra-customer-profile';

interface CustomerProfile {
  phone: string;
  name?: string | null;
  avatarUrl?: string | null;
  points: number;
  walletBalance?: number;
  hasProfile: boolean;
  latitude?: number | null;
  longitude?: number | null;
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
  // Locally-persisted profile so we can show the user as logged-in immediately
  // on launch and keep them logged in while offline.
  const [cachedProfile, setCachedProfile] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    setCustomerSessionToken(token);
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedProfile] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
        ]);
        if (storedToken) setToken(storedToken);
        if (storedProfile) {
          try {
            setCachedProfile(JSON.parse(storedProfile));
          } catch {
            // ignore corrupt cache
          }
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const meQuery = useGetMe({
    query: {
      enabled: !!token,
      // Retry transient failures a couple times, but NEVER retry a 401 — an
      // expired/invalid token should surface immediately so we can log out.
      retry: (count: number, err: any) => err?.status !== 401 && count < 2,
    } as any,
  });

  // Persist every successful profile fetch so it's available offline next time.
  useEffect(() => {
    if (meQuery.data) {
      const profile = meQuery.data as CustomerProfile;
      setCachedProfile(profile);
      AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => {});
    }
  }, [meQuery.data]);

  // Only a genuine 401 (invalid/expired token) logs the user out. Network
  // errors, timeouts and offline states keep the cached session intact.
  useEffect(() => {
    if ((meQuery.error as any)?.status === 401) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.error]);

  // The effective profile: fresh data when available, otherwise the last known
  // profile from storage (offline / flaky network).
  const effectiveProfile = (meQuery.data as CustomerProfile | undefined) ?? cachedProfile;

  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();
  const updateMeMutation = useUpdateMe();

  // Silently capture the customer's location once right after login (no
  // separate screen/prompt) so the stores list and product search can be
  // sorted nearest-first immediately. Only attempted once per app session —
  // if permission is denied or GPS has no fix, we just skip it quietly and
  // the customer can still browse everything unsorted.
  const locationAttempted = React.useRef(false);
  useEffect(() => {
    if (!token || !meQuery.data) return;
    const profile = meQuery.data as CustomerProfile;
    if (profile.latitude != null && profile.longitude != null) return;
    if (locationAttempted.current) return;
    locationAttempted.current = true;
    (async () => {
      const coords = await getCurrentPositionSafe();
      if (!coords) return;
      try {
        await updateMeMutation.mutateAsync({
          data: { latitude: coords.latitude, longitude: coords.longitude },
        });
        queryClient.invalidateQueries();
      } catch {
        // best-effort — a failed silent location save shouldn't interrupt anything
      }
    })();
  }, [token, meQuery.data, updateMeMutation]);

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
    setCachedProfile(null);
    AsyncStorage.removeItem(TOKEN_KEY);
    AsyncStorage.removeItem(PROFILE_KEY);
    queryClient.clear();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      // Keep the user logged in with their cached profile even when /me can't be
      // reached (offline). Never null just because the network is down.
      customer: token ? effectiveProfile : null,
      isReady,
      isAuthenticated: !!token && !!effectiveProfile,
      requestOtp,
      verifyOtp,
      updateProfile,
      logout,
    }),
    [token, effectiveProfile, isReady, requestOtp, verifyOtp, updateProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
