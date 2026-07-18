import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useListOrders, useListCustomers, useListProducts } from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { BroadcastComposer } from '@/components/admin/BroadcastComposer';

export function OverviewTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const ordersQuery = useListOrders(undefined, { request: adminRequest });
  const customersQuery = useListCustomers({ request: adminRequest });
  const productsQuery = useListProducts();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [logMode, setLogMode] = useState<'daily' | 'monthly'>('daily');

  const orders = ordersQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const products = productsQuery.data ?? [];

  const totalSales = orders.reduce((s, o) => s + o.total, 0);
  const delivered = orders.filter((o) => o.status === 'تم التسليم');
  const deliveredSales = delivered.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status !== 'تم التسليم');

  const today = new Date();
  const isToday = (d: string) => {
    const t = new Date(d);
    return (
      t.getFullYear() === today.getFullYear() &&
      t.getMonth() === today.getMonth() &&
      t.getDate() === today.getDate()
    );
  };
  const todayOrders = orders.filter((o) => isToday(o.createdAt));
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);

  const inStock = products.filter((p) => p.inStock);
  const outOfStock = products.filter((p) => !p.inStock);
  const onOffer = products.filter((p) => p.originalPrice != null && p.originalPrice > p.price);

  const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  const dayLog = (() => {
    const map = new Map<string, { label: string; total: number; orders: typeof orders; items: Map<string, number>; buyers: Set<string> }>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          label: d.toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          total: 0,
          orders: [],
          items: new Map(),
          buyers: new Set(),
        };
        map.set(key, entry);
      }
      entry.total += o.total;
      entry.orders.push(o);
      entry.buyers.add(o.customerPhone);
      for (const it of o.items) {
        entry.items.set(it.name, (entry.items.get(it.name) ?? 0) + it.qty);
      }
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([key, v]) => ({ key, ...v }));
  })();

  const customerNameByPhone = new Map(customers.map((c) => [c.phone, c.name || c.phone]));

  const monthLog = (() => {
    const map = new Map<string, { label: string; total: number; orderCount: number; buyers: Set<string>; items: Map<string, number> }>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          label: d.toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' }),
          total: 0,
          orderCount: 0,
          buyers: new Set(),
          items: new Map(),
        };
        map.set(key, entry);
      }
      entry.total += o.total;
      entry.orderCount += 1;
      entry.buyers.add(o.customerPhone);
      for (const it of o.items) {
        entry.items.set(it.name, (entry.items.get(it.name) ?? 0) + it.qty);
      }
    }
    const asc = [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    return asc.map(([key, v], i) => {
      const prev = i > 0 ? asc[i - 1][1].total : null;
      const changePct = prev != null && prev > 0 ? Math.round(((v.total - prev) / prev) * 100) : null;
      const topItems = [...v.items.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      return { key, ...v, changePct, topItems };
    }).reverse();
  })();

  const loading = ordersQuery.isLoading || customersQuery.isLoading || productsQuery.isLoading;

  const StatCard = ({ icon, label, value, tint, secondary }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string; tint: string; secondary?: boolean }) => (
    <View style={[styles.statCard, { backgroundColor: secondary ? colors.muted : colors.card, borderColor: secondary ? 'transparent' : colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: tint + '15' }]}>
        <Feather name={icon} size={18} color={tint} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BroadcastComposer />

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المبيعات والأداء</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="pie-chart" label="إجمالي الإيرادات" value={formatIQD(totalSales)} tint={colors.primary} />
        <StatCard icon="check-circle" label="مبيعات مسلّمة" value={formatIQD(deliveredSales)} tint={colors.success} secondary />
        <StatCard icon="sun" label="مبيعات اليوم" value={formatIQD(todaySales)} tint={colors.accent} />
        <StatCard icon="shopping-bag" label="طلبات اليوم" value={String(todayOrders.length)} tint={colors.primary} secondary />
      </View>

      <View style={styles.logHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>سجل المبيعات</Text>
        <View style={[styles.segmented, { backgroundColor: colors.muted }]}>
          {(
            [
              { key: 'daily', label: 'يومي' },
              { key: 'monthly', label: 'شهري' },
            ] as const
          ).map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setLogMode(m.key)}
              style={[styles.segmentBtn, logMode === m.key ? { backgroundColor: colors.card, shadowColor: colors.foreground } : null, logMode === m.key && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, { color: logMode === m.key ? colors.primary : colors.mutedForeground }]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {logMode === 'monthly' ? (
        <View style={styles.logList}>
          {monthLog.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد مبيعات مسجلة</Text>
          ) : (
            monthLog.map((m) => (
              <View key={m.key} style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.logCardHeader}>
                  <View style={[styles.dateBadge, { backgroundColor: colors.accent + '15' }]}>
                    <Feather name="calendar" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.logCardInfo}>
                    <Text style={[styles.logCardTitle, { color: colors.foreground }]}>{m.label}</Text>
                    <Text style={[styles.logCardMeta, { color: colors.mutedForeground }]}>
                      {m.orderCount} طلب · {m.buyers.size} عميل
                    </Text>
                  </View>
                  <View style={styles.logCardValueBox}>
                    <Text style={[styles.logCardTotal, { color: colors.primary }]}>{formatIQD(m.total)}</Text>
                    {m.changePct != null ? (
                      <View style={[styles.changeBadge, { backgroundColor: (m.changePct >= 0 ? colors.success : colors.destructive) + '15' }]}>
                        <Feather name={m.changePct >= 0 ? 'trending-up' : 'trending-down'} size={12} color={m.changePct >= 0 ? colors.success : colors.destructive} />
                        <Text style={[styles.changeText, { color: m.changePct >= 0 ? colors.success : colors.destructive }]}>
                          {Math.abs(m.changePct)}%
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.changeBadgeText, { color: colors.mutedForeground }]}>شهر أول</Text>
                    )}
                  </View>
                </View>
                {m.topItems.length > 0 ? (
                  <View style={[styles.logCardFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.logCardMeta, { color: colors.mutedForeground }]}>الأكثر مبيعاً:</Text>
                    <Text style={[styles.topItemsText, { color: colors.foreground }]} numberOfLines={1}>
                      {m.topItems.map(([n, q]) => `${n} ×${q}`).join('، ')}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.logList}>
          {dayLog.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد مبيعات مسجلة</Text>
          ) : (
            dayLog.map((day) => {
              const expanded = expandedDay === day.key;
              const dayDate = new Date(day.orders[0].createdAt);
              return (
                <View key={day.key} style={[styles.logCard, { backgroundColor: colors.card, borderColor: expanded ? colors.primary + '50' : colors.border }]}>
                  <Pressable onPress={() => setExpandedDay(expanded ? null : day.key)} style={styles.logCardHeader}>
                    <View style={[styles.dateBadge, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.dateNum, { color: colors.primary }]}>{dayDate.getDate()}</Text>
                      <Text style={[styles.dateMonth, { color: colors.primary }]}>{dayDate.toLocaleDateString('ar-IQ', { month: 'short' })}</Text>
                    </View>
                    <View style={styles.logCardInfo}>
                      <Text style={[styles.logCardTitle, { color: colors.foreground }]}>{dayDate.toLocaleDateString('ar-IQ', { weekday: 'long' })}</Text>
                      <Text style={[styles.logCardMeta, { color: colors.mutedForeground }]}>
                        {day.orders.length} طلب · {day.buyers.size} عميل
                      </Text>
                    </View>
                    <View style={styles.logCardValueBox}>
                      <Text style={[styles.logCardTotal, { color: colors.primary }]}>{formatIQD(day.total)}</Text>
                      <Text style={[styles.changeBadgeText, { color: colors.mutedForeground }]}>الإيراد</Text>
                    </View>
                    <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
                  </Pressable>

                  {expanded ? (
                    <View style={[styles.dayDetails, { borderTopColor: colors.border }]}>
                      <View style={styles.detailsHeader}>
                        <Feather name="box" size={14} color={colors.accent} />
                        <Text style={[styles.detailsTitle, { color: colors.foreground }]}>المنتجات المباعة</Text>
                      </View>
                      <View style={[styles.itemsTable, { borderColor: colors.border }]}>
                        {[...day.items.entries()].sort((a, b) => b[1] - a[1]).map(([itemName, qty], idx, arr) => (
                          <View key={itemName} style={[styles.itemRow, idx < arr.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : null]}>
                            <Text style={[styles.itemName, { color: colors.foreground }]}>{itemName}</Text>
                            <View style={[styles.itemBadge, { backgroundColor: colors.muted }]}>
                              <Text style={[styles.itemBadgeText, { color: colors.foreground }]}>×{qty}</Text>
                            </View>
                          </View>
                        ))}
                      </View>

                      <View style={[styles.detailsHeader, { marginTop: 16 }]}>
                        <Feather name="users" size={14} color={colors.accent} />
                        <Text style={[styles.detailsTitle, { color: colors.foreground }]}>مشتريات العملاء</Text>
                      </View>
                      <View style={styles.ordersList}>
                        {day.orders.map((o) => (
                          <View key={o.id} style={[styles.orderRow, { backgroundColor: colors.muted }]}>
                            <View style={styles.orderRowInfo}>
                              <View style={styles.orderRowHeader}>
                                <Text style={[styles.orderCustomerName, { color: colors.foreground }]}>
                                  {customerNameByPhone.get(o.customerPhone) ?? o.customerPhone}
                                </Text>
                                <Text style={[styles.orderTime, { color: colors.mutedForeground }]}>
                                  طلب #{o.id} · {new Date(o.createdAt).toLocaleTimeString('ar-IQ', { hour: 'numeric', minute: '2-digit' })}
                                </Text>
                              </View>
                              <Text style={[styles.orderItemsPreview, { color: colors.mutedForeground }]} numberOfLines={2}>
                                {o.items.map((it) => `${it.name} ×${it.qty}`).join('، ')}
                              </Text>
                            </View>
                            <Text style={[styles.orderTotalValue, { color: colors.primary }]}>{formatIQD(o.total)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>حالة المخزون</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="layers" label="إجمالي المنتجات" value={String(products.length)} tint={colors.primary} secondary />
        <StatCard icon="check" label="منتجات متوفرة" value={String(inStock.length)} tint={colors.success} />
        <StatCard icon="alert-triangle" label="منتجات نافذة" value={String(outOfStock.length)} tint={colors.destructive} />
        <StatCard icon="percent" label="عروض نشطة" value={String(onOffer.length)} tint={colors.warning} secondary />
      </View>

      {outOfStock.length > 0 ? (
        <View style={[styles.warningBox, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive + '25' }]}>
          <View style={styles.warningHeader}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.warningTitle, { color: colors.destructive }]}>تنبيه نفاد المخزون:</Text>
          </View>
          <Text style={[styles.warningText, { color: colors.foreground }]}>
            {outOfStock.map((p) => p.name).join('، ')}
          </Text>
        </View>
      ) : null}

      {topCustomers.length > 0 ? (
        <View style={styles.topCustomersSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أفضل العملاء</Text>
          <View style={styles.topCustomersList}>
            {topCustomers.map((c, i) => (
              <View key={c.phone} style={[styles.customerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.rankBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.rankText, { color: colors.mutedForeground }]}>{i + 1}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={[styles.customerName, { color: colors.foreground }]}>{c.name || c.phone}</Text>
                  <Text style={[styles.customerMeta, { color: colors.mutedForeground }]}>{c.orderCount} طلب مكتمل</Text>
                </View>
                <Text style={[styles.customerSpent, { color: colors.primary }]}>{formatIQD(c.totalSpent)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
    marginTop: 24,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  logHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
  segmented: {
    flexDirection: 'row-reverse',
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentBtnActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  logList: {
    gap: 12,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  logCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNum: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  dateMonth: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 12,
  },
  logCardInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  logCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  logCardMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 2,
  },
  logCardValueBox: {
    alignItems: 'flex-end',
    gap: 4,
  },
  logCardTotal: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  changeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  changeBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  logCardFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  topItemsText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'right',
  },
  dayDetails: {
    borderTopWidth: 1,
    padding: 16,
  },
  detailsHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailsTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  itemsTable: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  itemBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  itemBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  ordersList: {
    gap: 8,
  },
  orderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  orderRowInfo: {
    flex: 1,
  },
  orderRowHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderCustomerName: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  orderTime: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  orderItemsPreview: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
  orderTotalValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  warningHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  warningTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  warningText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
  },
  topCustomersSection: {
    marginTop: 12,
  },
  topCustomersList: {
    gap: 10,
  },
  customerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  customerInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  customerName: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  customerMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 2,
  },
  customerSpent: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});