import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useListOrders } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { OrderCard } from '@/components/OrderCard';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/auth-context';

export default function OrdersScreen() {
  return <OrdersContent />;
}

function OrdersContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { customer } = useAuth();

  const ordersQuery = useListOrders(
    { phone: customer?.phone },
    { query: { enabled: !!customer?.phone } as any },
  );

  // Guests can open the page normally; instead of blocking it we show a gentle
  // login prompt where the order list would be.
  if (!customer) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { paddingTop: insets.top + 16, color: colors.foreground }]}>
          طلباتي
        </Text>
        <View style={styles.guestBox}>
          <EmptyState
            icon="package"
            title="سجّل دخولك لعرض طلباتك"
            subtitle="بعد تسجيل الدخول بواتساب راح تشوف كل طلباتك وحالتها هنا"
          />
          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="log-in" size={16} color={colors.primaryForeground} />
            <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>
              تسجيل الدخول
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
  guestBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  loginBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  loginBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
