import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useListStoreOrders,
  useListStoreCustomers,
  useListProducts,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { BroadcastComposer } from '@/components/admin/BroadcastComposer';

// Per-store snapshot for the owner: everything here is scoped to this store's
// own orders, products and customers — no other merchant's data is mixed in.
export function MerchantOverview({ storeId }: { storeId: number }) {
  const colors = useColors();
  const ordersQuery = useListStoreOrders(storeId);
  const customersQuery = useListStoreCustomers(storeId);
  const productsQuery = useListProducts({ storeId });

  const loading =
    ordersQuery.isLoading || customersQuery.isLoading || productsQuery.isLoading;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const orders = ordersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const pendingOrders = orders.filter(
    (o) => o.status !== 'تم التسليم' && o.status !== 'ملغي',
  ).length;
  const outOfStock = products.filter((p) => !p.inStock).length;

  const stats: {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    color: string;
  }[] = [
    { label: 'إجمالي المبيعات', value: formatIQD(revenue), icon: 'trending-up', color: colors.primary },
    { label: 'عدد الطلبات', value: String(orders.length), icon: 'inbox', color: colors.foreground },
    { label: 'طلبات قيد التنفيذ', value: String(pendingOrders), icon: 'clock', color: colors.accent },
    { label: 'عدد المنتجات', value: String(products.length), icon: 'package', color: colors.foreground },
    { label: 'منتجات غير متوفرة', value: String(outOfStock), icon: 'alert-triangle', color: colors.warning ?? colors.accent },
    { label: 'عدد العملاء', value: String(customers.length), icon: 'users', color: colors.foreground },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BroadcastComposer storeId={storeId} />

      <Text style={[styles.title, { color: colors.foreground }]}>نظرة عامة على متجرك</Text>
      <View style={styles.grid}>
        {stats.map((s) => (
          <View
            key={s.label}
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: s.color + '15' }]}>
              <Feather name={s.icon} size={18} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: 'flex-end',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'right',
  },
});
