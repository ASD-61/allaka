import * as Updates from 'expo-updates';

/**
 * Silently checks for an Over-The-Air (EAS Update) bundle and, if one is
 * available, downloads it and reloads the app so the user immediately runs the
 * latest JS/UI — no new APK / store submission needed.
 *
 * Safe to call on every launch: it's a no-op in development (Expo Go / dev
 * client) and when updates are disabled, and it swallows all errors so a failed
 * check never blocks or crashes the app.
 */
export async function checkForOtaUpdate(): Promise<void> {
  // Only meaningful in a production build where expo-updates is enabled.
  if (__DEV__ || !Updates.isEnabled) return;

  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Reload into the freshly downloaded bundle.
      await Updates.reloadAsync();
    }
  } catch {
    // Ignore — a failed OTA check must never interrupt the app.
  }
}
