import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NotificationWatcher } from '@/components/NotificationWatcher';
import { setBaseUrl } from '@workspace/api-client-react';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { Feather } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/context/auth-context';
import { AdminProvider } from '@/context/admin-context';
import { CartProvider } from '@/context/cart-context';
import { ThemeProvider } from '@/context/theme-context';
import { queryClient } from '@/lib/query-client';
import { schemeForDomain } from '@/lib/api-scheme';

// Expo bundles run outside the shared web proxy — set an absolute base URL
// so requests reach the shared api-server.
const apiDomain = process.env.EXPO_PUBLIC_DOMAIN ?? '';
setBaseUrl(`${schemeForDomain(apiDomain)}://${apiDomain}`);

SplashScreen.preventAutoHideAsync();

// In Expo Go the dev-server host is advertised without a scheme, so asset
// URLs (including font files) default to http://. The Replit dev proxy only
// serves real content over https — the http fetch "succeeds" but returns
// garbage, so fonts register corrupt: text silently falls back to the system
// font and icon glyphs render as invisible/blank. Force every font asset to
// resolve to an https URL before loading.
function secureFontSource(source: unknown): unknown {
  if (typeof source !== 'number') return source;
  try {
    const uri = Asset.fromModule(source).uri;
    if (typeof uri === 'string' && uri.startsWith('http://')) {
      return uri.replace(/^http:\/\//, 'https://');
    }
  } catch {
    // fall through to the original module source
  }
  return source;
}

const FONT_MAP = Object.fromEntries(
  Object.entries({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    ...Feather.font,
  }).map(([name, source]) => [name, secureFontSource(source)]),
) as Record<string, any>;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'رجوع' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ presentation: 'modal', title: 'تسجيل الدخول' }} />
      <Stack.Screen name="profile-setup" options={{ presentation: 'modal', title: 'إكمال الملف الشخصي', gestureEnabled: false }} />
      <Stack.Screen name="addresses" options={{ title: 'عناوين التوصيل' }} />
      <Stack.Screen name="notifications" options={{ title: 'الإشعارات' }} />
      <Stack.Screen name="help" options={{ title: 'المساعدة والدعم' }} />
      <Stack.Screen name="admin/login" options={{ title: 'دخول الإدارة' }} />
      <Stack.Screen name="admin/index" options={{ headerShown: false }} />
      <Stack.Screen name="stores" options={{ title: 'المتاجر' }} />
      <Stack.Screen name="store/[id]" options={{ title: 'المتجر' }} />
      <Stack.Screen name="register-store" options={{ title: 'تسجيل متجر' }} />
      <Stack.Screen name="my-store/index" options={{ title: 'متاجري' }} />
      <Stack.Screen name="my-store/[id]" options={{ title: 'متجري' }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Feather.font must be preloaded explicitly: relying on @expo/vector-icons'
  // lazy internal load left every icon invisible on real devices in Expo Go
  // (the web preview masked the problem because browsers load fonts directly).
  const [fontsLoaded, fontError] = useFonts(FONT_MAP);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AdminProvider>
              <AuthProvider>
                <CartProvider>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <NotificationWatcher />
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </CartProvider>
              </AuthProvider>
            </AdminProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
