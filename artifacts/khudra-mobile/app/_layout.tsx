import React, { useEffect } from 'react';
import { Platform, Text as RNText, TextInput as RNTextInput } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NotificationWatcher } from '@/components/NotificationWatcher';
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner';
import { checkForOtaUpdate } from '@/lib/ota';
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
import { queryClient, persistOptions } from '@/lib/query-client';
import { schemeForDomain, resolveApiDomain } from '@/lib/api-scheme';

// Crash & error reporting. The DSN is public by design (safe to ship). Errors,
// unhandled rejections and native crashes are captured with device + release
// context so we get a precise report (screen, stack, device) per incident.
Sentry.init({
  dsn: 'https://4a076259d1f032efbd3d3c0443a1cba1@o4511787815272448.ingest.de.sentry.io/4511787838210128',
  // Only send from real (production) builds, not from Expo Go / dev.
  enabled: !__DEV__ && Platform.OS !== 'web',
  tracesSampleRate: 0.2,
  // Attach a light breadcrumb trail; avoid sending PII.
  sendDefaultPii: false,
});

// Pin text to the app's design sizes regardless of the device's system
// font/display-size setting. Some phones (e.g. Honor X8, Samsung with large
// display size) scale text up, which overflowed fixed-height rows and the tab
// labels so glyphs got clipped ("العروض" → "العرو", half-cut product names).
// Disabling font scaling app-wide makes the layout render identically on every
// device. Kept as a small allowance (1.15x) via maxFontSizeMultiplier so
// accessibility isn't fully ignored where a line can grow.
{
  const t = RNText as unknown as { defaultProps?: Record<string, unknown> };
  t.defaultProps = t.defaultProps || {};
  t.defaultProps.allowFontScaling = false;
  t.defaultProps.maxFontSizeMultiplier = 1.15;
  const ti = RNTextInput as unknown as { defaultProps?: Record<string, unknown> };
  ti.defaultProps = ti.defaultProps || {};
  ti.defaultProps.allowFontScaling = false;
  ti.defaultProps.maxFontSizeMultiplier = 1.15;
}

// Expo bundles run outside the shared web proxy — set an absolute base URL
// so requests reach the shared api-server.
const apiDomain = resolveApiDomain();
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
      // Only upgrade real remote hosts to https (the Replit dev proxy serves
      // garbage over http). A local LAN dev server (dev:lan → http://<ip>:8081)
      // is http-only, so forcing https there would FAIL to load the font and
      // leave icons invisible on device — keep those as http.
      const host = uri.replace(/^http:\/\//, '').split('/')[0].split(':')[0];
      const isLocal = /^(localhost|127\.0\.0\.1|\d{1,3}(\.\d{1,3}){3})$/.test(host);
      if (!isLocal) {
        return uri.replace(/^http:\/\//, 'https://');
      }
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
      <Stack.Screen name="product/[id]" options={{ title: 'المنتج' }} />
      <Stack.Screen name="rate/[orderId]" options={{ title: 'تقييم المتجر' }} />
      <Stack.Screen name="wallet" options={{ title: 'محفظتي' }} />
      <Stack.Screen name="referral" options={{ title: 'دعوة الأصدقاء' }} />
      <Stack.Screen name="register-store" options={{ title: 'تسجيل متجر' }} />
      <Stack.Screen name="my-store/index" options={{ title: 'متاجري' }} />
      <Stack.Screen name="my-store/[id]" options={{ title: 'متجري' }} />
    </Stack>
  );
}

function RootLayout() {
  // Feather.font must be preloaded explicitly: relying on @expo/vector-icons'
  // lazy internal load left every icon invisible on real devices in Expo Go
  // (the web preview masked the problem because browsers load fonts directly).
  const [fontsLoaded, fontError] = useFonts(FONT_MAP);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Pull any published Over-The-Air (EAS Update) bundle on launch.
  useEffect(() => {
    checkForOtaUpdate();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={persistOptions as any}
          >
            <AdminProvider>
              <AuthProvider>
                <CartProvider>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <NotificationWatcher />
                      <NetworkStatusBanner />
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </CartProvider>
              </AuthProvider>
            </AdminProvider>
          </PersistQueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Wrap the root so Sentry can capture navigation context and touch events.
export default Sentry.wrap(RootLayout);
