import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useListOrders, useListCustomers, useUpdateOrderStatus } from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useAdminStoreIds, isAdminOwned } from '@/hooks/useAdminStoreIds';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD, formatDate } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';

const ORDER_STATUSES = ['قيد التحضير', 'في الطريق', 'تم التسليم'] as const;

export function OrdersTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const ordersQuery = useListOrders(undefined, { request: adminRequest });
  const customersQuery = useListCustomers({ request: adminRequest });
  const updateStatus = useUpdateOrderStatus({ request: adminRequest });
  const adminStoreIds = useAdminStoreIds();

  // Only the admin's own store orders — merchant orders live in their own
  // dashboards and must never mix into the admin's view.
  const adminOrders = (ordersQuery.data ?? []).filter((o) =>
    isAdminOwned(o.storeId, adminStoreIds),
  );

  const nameByPhone = new Map((customersQuery.data ?? []).map((c) => [c.phone, c.name]));
  const statusColor = (status: string) =>
    status === 'تم التسليم' ? colors.success : status === 'في الطريق' ? colors.warning : colors.destructive;

  return (
    <FlatList
      data={adminOrders}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      onRefresh={() => ordersQuery.refetch()}
      refreshing={ordersQuery.isFetching}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListEmptyComponent={
        ordersQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 60 }} />
        ) : (
          <View style={{ marginTop: 40 }}>
            <EmptyState icon="inbox" title="لا توجد طلبات جديدة" />
          </View>
        )
      }
      renderItem={({ item }) => {
        const cColor = statusColor(item.status);
        return (
          <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground }]}>
            <View style={[styles.orderHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.idRow}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.muted }]}>
                  <Feather name="shopping-bag" size={16} color={colors.foreground} />
                </View>
                <Text style={[styles.orderId, { color: colors.foreground }]}>طلب #{item.id}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: cColor + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: cColor }]} />
                <Text style={[styles.statusText, { color: cColor }]}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.orderBody}>
              <View style={styles.metaRow}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="user" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.foreground }]}>
                  {nameByPhone.get(item.customerPhone) ? `${nameByPhone.get(item.customerPhone)} · ` : ''}
                  <Text style={{ fontFamily: fonts.regular, color: colors.mutedForeground }}>{item.customerPhone}</Text>
                </Text>
              </View>
              
              {item.pickupTime ? (
                <View style={styles.metaRow}>
                  <Feather name="clock" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.foreground }]}>
                    وقت الاستلام: {item.pickupTime}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.itemsBox, { backgroundColor: colors.muted }]}>
                <Text style={[styles.itemsText, { color: colors.foreground }]} numberOfLines={3}>
                  {item.items.map((it) => `${it.name} ×${it.qty}`).join('، ')}
                </Text>
              </View>

              {item.note ? (
                <View style={[styles.noteBox, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '20' }]}>
                  <Feather name="message-square" size={14} color={colors.warning} />
                  <Text style={[styles.noteText, { color: colors.warning }]}>{item.note}</Text>
                </View>
              ) : null}

              {(item.walletApplied ?? 0) > 0 ? (
                <View style={styles.metaRow}>
                  <Feather name="credit-card" size={14} color={colors.success} />
                  <Text style={[styles.metaText, { color: colors.success }]}>
                    مخصوم من المحفظة: {formatIQD(item.walletApplied ?? 0)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>المجموع النهائي</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>{formatIQD(item.total)}</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              {ORDER_STATUSES.map((status) => {
                const isActive = item.status === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => updateStatus.mutate({ id: item.id, data: { status } })}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: isActive ? colors.primary : colors.muted,
                        opacity: isActive ? 1 : 0.8,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        { color: isActive ? colors.primaryForeground : colors.mutedForeground },
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 20,
    paddingBottom: 60,
  },
  orderCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  orderHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  idRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderId: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  orderBody: {
    padding: 16,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  itemsBox: {
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  itemsText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 22,
  },
  noteBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  noteText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  totalValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});