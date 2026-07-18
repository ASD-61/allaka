import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListOrders } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { OrderCard } from '@/components/OrderCard';
import { EmptyState } from '@/components/EmptyState';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/auth-context';

export default function OrdersScreen() {
  return (
    <RequireAuth message="سجّل دخولك لعرض طلباتك">
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { customer } = useAuth();

  const ordersQuery = useListOrders(
    { phone: customer?.phone },
    { query: { enabled: !!customer?.phone } as any },
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { paddingTop: insets.top + 16, color: colors.foreground }]}>
        طلباتي
      </Text>
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        onRefresh={() => ordersQuery.refetch()}
        refreshing={ordersQuery.isFetching}
        renderItem={({ item }) => <OrderCard order={item} />}
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon="package" title="لا توجد طلبات بعد" subtitle="ابدأ التسوق من الرئيسية" />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
