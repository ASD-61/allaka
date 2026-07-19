import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/theme-context';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useCart } from '@/context/cart-context';

// A stable, module-level component (not one re-created inline on every
// render) — recreating the icon component on every render of
// ClassicTabLayout (e.g. whenever the cart count or theme changed) forced
// React to remount it each time, which made the vector-icon glyph glitch
// out to invisible/"transparent" on real devices even though the layout
// looked fine on the (more forgiving) web preview.
function TabIcon({
  name,
  label,
  focused,
  colors,
  scheme,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  label: string;
  focused: boolean;
  colors: ReturnType<typeof useColors>;
  scheme: 'light' | 'dark';
}) {
  const tint = focused ? colors.primary : colors.mutedForeground;
  return (
    <View
      style={[
        styles.chip,
        focused
          ? // A tinted fill of the active color itself (not `colors.card`, which
            // is the exact same color as the tab bar's own surface in both
            // themes and made the "chip" invisible whenever the drop shadow
            // rendering was weak/absent) — this always reads as a distinct
            // pill regardless of light/dark mode, with no reliance on shadows.
            { backgroundColor: colors.primary + '1F' }
          : null,
      ]}
    >
      <Feather name={name} size={19} color={tint} style={{ opacity: 1 }} />
      <Text style={[styles.chipLabel, { color: tint }]}>{label}</Text>
    </View>
  );
}

function NativeTabLayout() {
  const { totalCount } = useCart();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>الرئيسية</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="offers">
        <Icon sf={{ default: 'tag', selected: 'tag.fill' }} />
        <Label>العروض</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart">
        <Icon sf={{ default: 'cart', selected: 'cart.fill' }} />
        <Label>{totalCount > 0 ? `السلة (${totalCount})` : 'السلة'}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <Icon sf={{ default: 'bag', selected: 'bag.fill' }} />
        <Label>طلباتي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>حسابي</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { totalCount } = useCart();
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  // Give the bar an explicit height + bottom safe-area padding so it renders
  // identically across phones and tablets/iPads (relying on the platform
  // default made the bar taller/shorter and clipped icons on some devices,
  // e.g. large Samsung/Android gesture-nav phones).
  const barHeight = (isWeb ? 84 : 60) + insets.bottom;
  // The blur tint must follow the device's actual appearance — a light-tinted
  // blur behind dark-mode icon/label colors reads as low-contrast and "muddled".
  const blurTint = scheme === 'dark' ? 'dark' : 'light';

  // Using the page background here (instead of a distinct surface color) left
  // the bar with zero contrast against the content behind it — it read as
  // "empty"/unstyled, especially in dark mode. `card` + a visible top shadow
  // gives the bar its own elevated surface, like a real bottom-nav component.
  //
  // The active tab renders as a raised white/card "chip" that floats above
  // the bar line (icon + label together, built here instead of via the
  // default tabBarIcon/tabBarLabel split) so the selected tab reads as a
  // distinct floating button rather than just a recolored icon.
  // IMPORTANT: keep this a column (icon above label), not a row. A row needs
  // icon + label side-by-side within a single ~1/4-width tab slot, which is
  // too narrow on real phones — the label silently collapsed to nothing on
  // device even though it looked fine in the (wider) web preview.
  const tabIcon = (name: React.ComponentProps<typeof Feather>['name'], label: string) =>
    ({ focused }: { focused: boolean }) => (
      <TabIcon name={name} label={label} focused={focused} colors={colors} scheme={scheme} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingTop: 6 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          boxShadow: `0px -2px 12px ${scheme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(15,26,20,0.08)'}`,
          elevation: 12,
          height: barHeight,
          paddingBottom: insets.bottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={blurTint} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: tabIcon('home', 'الرئيسية'),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: 'العروض',
          tabBarIcon: tabIcon('percent', 'العروض'),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'السلة',
          tabBarIcon: tabIcon('shopping-cart', 'السلة'),
          tabBarBadge: totalCount > 0 ? totalCount : undefined,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'طلباتي',
          tabBarIcon: tabIcon('package', 'طلباتي'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: tabIcon('user', 'حسابي'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 56,
  },
  chipLabel: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
