import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useGetStore } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { RequireAuth } from '@/components/RequireAuth';
import { MerchantOverview } from '@/components/merchant/MerchantOverview';
import { MerchantProducts } from '@/components/merchant/MerchantProducts';
import { MerchantCategories } from '@/components/merchant/MerchantCategories';
import { MerchantOrders } from '@/components/merchant/MerchantOrders';
import { MerchantCustomers } from '@/components/merchant/MerchantCustomers';
import { MerchantRefunds } from '@/components/merchant/MerchantRefunds';
import { MerchantSettings } from '@/components/merchant/MerchantSettings';
import { MerchantDrivers } from '@/components/merchant/MerchantDrivers';

type Tab =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'customers'
  | 'refunds'
  | 'drivers'
  | 'settings';

const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'overview', label: 'نظرة عامة', icon: 'activity' },
  { key: 'orders', label: 'الطلبات', icon: 'inbox' },
  { key: 'products', label: 'المنتجات', icon: 'package' },
  { key: 'categories', label: 'الفئات', icon: 'grid' },
  { key: 'customers', label: 'العملاء', icon: 'users' },
  { key: 'refunds', label: 'التعويضات', icon: 'rotate-ccw' },
  { key: 'drivers', label: 'المندوبين', icon: 'truck' },
  { key: 'settings', label: 'الإعدادات', icon: 'settings' },
];

export default function MyStoreDashboardScreen() {
  return (
    <RequireAuth message="سجّل دخولك حتى تدير متجرك">
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id: string }>();
  const storeId = Number(params.id);
  const storeQuery = useGetStore(storeId);
  const [tab, setTab] = useState<Tab>('overview');

  const store = storeQuery.data;

  if (storeQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'متجري' }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'متجري' }} />
        <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <Feather name="alert-circle" size={28} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.msgTitle, { color: colors.foreground }]}>تعذر تحميل المتجر</Text>
      </View>
    );
  }

  const canManage = store.status === 'مفعّل' || store.status === 'موقوف مؤقتاً';

  if (!canManage) {
    const isPending = store.status === 'قيد المراجعة';
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: store.name }} />
        <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <Feather name={isPending ? 'clock' : 'x-circle'} size={28} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.msgTitle, { color: colors.foreground }]}>
          {isPending ? 'متجرك قيد المراجعة' : 'تم رفض المتجر'}
        </Text>
        <Text style={[styles.msgSubtitle, { color: colors.mutedForeground }]}>
          {isPending
            ? 'راح تقدر تدير متجرك بعد ما توافق عليه الإدارة'
            : 'تواصل مع الإدارة لمعرفة التفاصيل'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: store.name }} />

      <View style={[styles.tabsWrap, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
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
        {tab === 'overview' ? <MerchantOverview storeId={storeId} /> : null}
        {tab === 'orders' ? <MerchantOrders storeId={storeId} /> : null}
        {tab === 'products' ? <MerchantProducts storeId={storeId} /> : null}
        {tab === 'categories' ? <MerchantCategories storeId={storeId} /> : null}
        {tab === 'customers' ? <MerchantCustomers storeId={storeId} /> : null}
        {tab === 'refunds' ? <MerchantRefunds storeId={storeId} /> : null}
        {tab === 'drivers' ? <MerchantDrivers storeId={storeId} /> : null}
        {tab === 'settings' ? (
          <MerchantSettings store={store} onSaved={() => storeQuery.refetch()} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  msgTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    textAlign: 'center',
  },
  msgSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  tabsWrap: {
    borderBottomWidth: 1,
    paddingVertical: 14,
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
