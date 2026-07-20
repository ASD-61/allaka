import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { useAdminAuth } from '@/context/admin-context';
import { OverviewTab } from '@/components/admin/OverviewTab';
import { OrdersTab } from '@/components/admin/OrdersTab';
import { ProductsTab } from '@/components/admin/ProductsTab';
import { CategoriesTab } from '@/components/admin/CategoriesTab';
import { CustomersTab } from '@/components/admin/CustomersTab';
import { RefundsTab } from '@/components/admin/RefundsTab';
import { StoresTab } from '@/components/admin/StoresTab';
import { StoreTypesTab } from '@/components/admin/StoreTypesTab';
import { DriversTab } from '@/components/admin/DriversTab';
import { SettingsTab } from '@/components/admin/SettingsTab';

type Tab =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'customers'
  | 'refunds'
  | 'stores'
  | 'storeTypes'
  | 'drivers'
  | 'settings';

const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'overview', label: 'نظرة عامة', icon: 'activity' },
  { key: 'orders', label: 'الطلبات', icon: 'inbox' },
  { key: 'products', label: 'المنتجات', icon: 'package' },
  { key: 'categories', label: 'الفئات', icon: 'grid' },
  { key: 'customers', label: 'العملاء', icon: 'users' },
  { key: 'refunds', label: 'التعويضات', icon: 'rotate-ccw' },
  { key: 'stores', label: 'المتاجر', icon: 'shopping-bag' },
  { key: 'storeTypes', label: 'الأنواع', icon: 'grid' },
  { key: 'drivers', label: 'المندوبين', icon: 'truck' },
  { key: 'settings', label: 'الإعدادات', icon: 'settings' },
];

export default function AdminDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAdmin, isReady, logout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>('overview');

  if (!isReady) return null;

  if (!isAdmin) {
    router.replace('/admin/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: colors.primary + '15' }]}>
              <Feather name="command" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>المركز الإداري</Text>
              <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>عـلاّكـة</Text>
            </View>
          </View>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              { backgroundColor: colors.destructive + '10', opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.logoutText, { color: colors.destructive }]}>تسجيل خروج</Text>
            <Feather name="log-out" size={14} color={colors.destructive} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? colors.foreground : colors.card,
                    borderColor: isActive ? colors.foreground : colors.border,
                  },
                ]}
              >
                <Feather
                  name={t.icon}
                  size={14}
                  color={isActive ? colors.background : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? colors.background : colors.foreground },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {tab === 'overview' ? <OverviewTab /> : null}
        {tab === 'orders' ? <OrdersTab /> : null}
        {tab === 'products' ? <ProductsTab /> : null}
        {tab === 'categories' ? <CategoriesTab /> : null}
        {tab === 'customers' ? <CustomersTab /> : null}
        {tab === 'refunds' ? <RefundsTab /> : null}
        {tab === 'stores' ? <StoresTab /> : null}
        {tab === 'storeTypes' ? <StoreTypesTab /> : null}
        {tab === 'drivers' ? <DriversTab /> : null}
        {tab === 'settings' ? <SettingsTab /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
  },
  headerSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'right',
    marginTop: -2,
  },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logoutText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  tabsScroll: {
    marginHorizontal: -20,
  },
  tabsRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 20,
    gap: 10,
  },
  tabChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
});