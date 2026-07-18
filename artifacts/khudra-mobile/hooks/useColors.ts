import colors from '@/constants/colors';
import { useTheme } from '@/context/theme-context';

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * The scheme follows the user's in-app light/dark/system preference
 * (see ThemeProvider) rather than the raw device setting directly, so a
 * manual override in the profile screen takes effect app-wide.
 */
export function useColors() {
  const { scheme } = useTheme();
  const palette = scheme === 'dark' && colors.dark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
