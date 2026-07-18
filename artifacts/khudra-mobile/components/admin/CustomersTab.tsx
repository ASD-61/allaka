import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useListCustomers, useListOrders } from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useAdminStoreIds, isAdminOwned } from '@/hooks/useAdminStoreIds';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD, formatDate } from '@/lib/format';
import { resolveImageUrl } from '@/lib/image-url';
import { EmptyState } from '@/components/EmptyState';

export function CustomersTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const query = useListCustomers({ request: adminRequest });
  const ordersQuery = useListOrders(undefined, { request: adminRequest });
  const adminStoreIds = useAdminStoreIds();
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);

  // Only customers who have ordered from the admin's own store, and only their
  // admin-store orders when expanded — keeps merchants' customers isolated.
  const adminOrders = (ordersQuery.data ?? []).filter((o) =>
    isAdminOwned(o.storeId, adminStoreIds),
  );
  const adminCustomerPhones = new Set(adminOrders.map((o) => o.customerPhone));
  const adminCustomers = (query.data ?? []).filter((c) =>
    adminCustomerPhones.has(c.phone),
  );

  return (
    <FlatList
      data={adminCustomers}
      keyExtractor={(item) => item.phone}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={
        query.isLoading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 60 }} />
        ) : (
          <View style={{ marginTop: 40 }}>
            <EmptyState icon="users" title="لا يوجد عملاء مسجلين" />
          </View>
        )
      }
      renderItem={({ item }) => {
        const expanded = expandedPhone === item.phone;
        const customerOrders = expanded
          ? adminOrders.filter((o) => o.customerPhone === item.phone)
          : [];
          
        return (
          <View style={[styles.customerCard, { backgroundColor: colors.card, borderColor: expanded ? colors.primary + '40' : colors.border }]}>
            <Pressable
              onPress={() => setExpandedPhone(expanded ? null : item.phone)}
              style={styles.customerHeader}
            >
              <View style={[styles.avatarBox, { backgroundColor: colors.primary + '10' }]}>
                {item.avatarUrl ? (
                  <Image
                    source={{ uri: resolveImageUrl(item.avatarUrl) }}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <Feather name="user" size={24} color={colors.primary} />
                )}
              </View>
              
              <View style={styles.customerInfo}>
                <Text style={[styles.customerName, { color: colors.foreground }]}>
                  {item.name || item.phone}
                </Text>
                <Text style={[styles.customerMeta, { color: colors.mutedForeground }]}>
                  {item.name ? `${item.phone} · ` : ''}
                  <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>{item.orderCount}</Text> طلب
                </Text>
              </View>

              <View style={styles.badgesBox}>
                {(item.walletBalance ?? 0) > 0 ? (
                  <View style={[styles.pointsBadge, { backgroundColor: colors.success + '15' }]}>
                    <Feather name="credit-card" size={12} color={colors.success} />
                    <Text style={[styles.pointsText, { color: colors.success }]}>{formatIQD(item.walletBalance ?? 0)}</Text>
                  </View>
                ) : null}
                <View style={[styles.pointsBadge, { backgroundColor: colors.warning + '15' }]}>
                  <Feather name="award" size={12} color={colors.warning} />
                  <Text style={[styles.pointsText, { color: colors.warning }]}>{item.points}</Text>
                </View>
                <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
              </View>
            </Pressable>

            {expanded ? (
              <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{formatIQD(item.totalSpent)}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>إجمالي المشتريات</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{formatDate(item.createdAt)}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>تاريخ الانضمام</Text>
                  </View>
                </View>

                <View style={styles.ordersSection}>
                  <Text style={[styles.ordersTitle, { color: colors.foreground }]}>سجل الطلبات</Text>
                  {ordersQuery.isLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                  ) : customerOrders.length === 0 ? (
                    <Text style={[styles.emptyOrders, { color: colors.mutedForeground }]}>
                      لا توجد طلبات لهذا العميل
                    </Text>
                  ) : (
                    <View style={styles.ordersList}>
                      {customerOrders.map((o) => (
                        <View key={o.id} style={[styles.orderRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <View style={styles.orderRowInfo}>
                            <View style={styles.orderRowHeader}>
                              <Text style={[styles.orderId, { color: colors.foreground }]}>طلب #{o.id}</Text>
                              <Text style={[styles.orderStatus, { color: o.status === 'تم التسليم' ? colors.success : colors.warning }]}>
                                {o.status}
                              </Text>
                            </View>
                            <Text style={[styles.orderItems, { color: colors.mutedForeground }]} numberOfLines={2}>
                              {o.items.map((it) => `${it.name} ×${it.qty}`).join('، ')}
                            </Text>
                            <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                              {formatDate(o.createdAt)}
                            </Text>
                          </View>
                          <Text style={[styles.orderTotal, { color: colors.primary }]}>{formatIQD(o.total)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : null}
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
  customerCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  customerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  customerInfo: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  customerName: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  customerMeta: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  badgesBox: {
    alignItems: 'center',
    gap: 8,
  },
  pointsBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pointsText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  ordersSection: {
    gap: 12,
  },
  ordersTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
  },
  emptyOrders: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  ordersList: {
    gap: 8,
  },
  orderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  orderRowInfo: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  orderRowHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  orderId: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  orderStatus: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  orderItems: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
  orderDate: {
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  orderTotal: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
});