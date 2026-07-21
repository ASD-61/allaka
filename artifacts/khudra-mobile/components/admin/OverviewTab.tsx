import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useListAllStores,
  useListCustomers,
  useListOrders,
} from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';

const ACTIVE = 'مفعّل';
const PENDING = 'قيد المراجعة';
const SUSPENDED = 'موقوف مؤقتاً';

const MS_DAY = 24 * 60 * 60 * 1000;

export function OverviewTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const storesQuery = useListAllStores({ request: adminRequest });
  const customersQuery = useListCustomers({ request: adminRequest });
  const ordersQuery = useListOrders(undefined, { request: adminRequest });

  const stores = storesQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const active = stores.filter((s) => s.status === ACTIVE);
  const pending = stores.filter((s) => s.status === PENDING);
  const suspended = stores.filter((s) => s.status === SUSPENDED);

  const newThisMonth = stores.filter((s) => {
    const c = (s as any).createdAt ? new Date((s as any).createdAt).getTime() : 0;
    return c >= monthStart;
  });

  // Active subscriptions and their expiry buckets.
  const withExpiry = active
    .map((s) => {
      const raw = (s as any).subscriptionExpiresAt;
      const exp = raw ? new Date(raw).getTime() : null;
      const days = exp != null ? Math.ceil((exp - now.getTime()) / MS_DAY) : null;
      return { store: s, days };
    })
    .filter((x) => x.days != null) as { store: (typeof active)[number]; days: number }[];

  const expiringSoon = withExpiry
    .filter((x) => x.days >= 0 && x.days <= 7)
    .sort((a, b) => a.days - b.days);
  const expired = withExpiry.filter((x) => x.days < 0).sort((a, b) => a.days - b.days);

  // Per-store buyers + revenue from all orders.
  const nameById = new Map(stores.map((s) => [s.id, s.name]));
  const perStore = (() => {
    const map = new Map<number, { buyers: Set<string>; revenue: number; orders: number }>();
    for (const o of orders) {
      const sid = (o as any).storeId as number | null;
      if (sid == null) continue;
      let e = map.get(sid);
      if (!e) {
        e = { buyers: new Set(), revenue: 0, orders: 0 };
        map.set(sid, e);
      }
      e.buyers.add(o.customerPhone);
      e.revenue += o.total;
      e.orders += 1;
    }
    return [...map.entries()]
      .map(([sid, v]) => ({
        id: sid,
        name: nameById.get(sid) ?? `متجر #${sid}`,
        buyers: v.buyers.size,
        revenue: v.revenue,
        orders: v.orders,
      }))
      .sort((a, b) => b.buyers - a.buyers);
  })();

  const recentStores = [...stores]
    .sort((a, b) => {
      const ca = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const cb = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return cb - ca;
    })
    .slice(0, 6);

  const loading =
    storesQuery.isLoading || customersQuery.isLoading || ordersQuery.isLoading;

  const StatCard = ({
    icon,
    label,
    value,
    tint,
    secondary,
  }: {
    icon: React.ComponentProps<typeof Feather>['name'];
    label: string;
    value: string;
    tint: string;
    secondary?: boolean;
  }) => (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: secondary ? colors.muted : colors.card,
          borderColor: secondary ? 'transparent' : colors.border,
        },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: tint + '15' }]}>
        <Feather name={icon} size={18} color={tint} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
    </View>
  );

  const fmtDate = (raw: any) =>
    raw
      ? new Date(raw).toLocaleDateString('ar-IQ', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '—';

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>نظرة عامة</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="shopping-bag" label="إجمالي المتاجر" value={String(stores.length)} tint={colors.primary} />
        <StatCard icon="check-circle" label="متاجر مفعّلة" value={String(active.length)} tint={colors.success} secondary />
        <StatCard icon="clock" label="بانتظار المراجعة" value={String(pending.length)} tint={colors.accent} />
        <StatCard icon="pause-circle" label="موقوفة مؤقتاً" value={String(suspended.length)} tint={colors.warning ?? colors.accent} secondary />
        <StatCard icon="user-plus" label="متاجر جديدة هذا الشهر" value={String(newThisMonth.length)} tint={colors.primary} secondary />
        <StatCard icon="users" label="إجمالي الزبائن" value={String(customers.length)} tint={colors.primary} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الاشتراكات</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="alert-triangle" label="ينتهي اشتراكها خلال ٧ أيام" value={String(expiringSoon.length)} tint={colors.warning ?? colors.accent} />
        <StatCard icon="x-circle" label="اشتراكات منتهية" value={String(expired.length)} tint={colors.destructive} secondary />
      </View>

      {expiringSoon.length > 0 ? (
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.listHeader}>
            <Feather name="clock" size={15} color={colors.warning ?? colors.accent} />
            <Text style={[styles.listTitle, { color: colors.foreground }]}>اشتراكات على وشك الانتهاء</Text>
          </View>
          {expiringSoon.map((x) => (
            <View key={x.store.id} style={[styles.row, { borderTopColor: colors.border }]}>
              <View style={[styles.daysPill, { backgroundColor: (colors.warning ?? colors.accent) + '20' }]}>
                <Text style={[styles.daysText, { color: colors.warning ?? colors.accent }]}>
                  {x.days === 0 ? 'اليوم' : `${x.days} يوم`}
                </Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>{x.store.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                  ينتهي: {fmtDate((x.store as any).subscriptionExpiresAt)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {expired.length > 0 ? (
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.listHeader}>
            <Feather name="x-circle" size={15} color={colors.destructive} />
            <Text style={[styles.listTitle, { color: colors.foreground }]}>اشتراكات منتهية</Text>
          </View>
          {expired.map((x) => (
            <View key={x.store.id} style={[styles.row, { borderTopColor: colors.border }]}>
              <View style={[styles.daysPill, { backgroundColor: colors.destructive + '20' }]}>
                <Text style={[styles.daysText, { color: colors.destructive }]}>
                  منذ {Math.abs(x.days)} يوم
                </Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>{x.store.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                  انتهى: {fmtDate((x.store as any).subscriptionExpiresAt)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الزبائن حسب المتجر</Text>
      {perStore.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد مبيعات بعد</Text>
      ) : (
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {perStore.map((s) => (
            <View key={s.id} style={[styles.row, { borderTopColor: colors.border }]}>
              <Text style={[styles.storeRevenue, { color: colors.primary }]}>{formatIQD(s.revenue)}</Text>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>{s.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                  {s.buyers} زبون · {s.orders} طلب
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أحدث المتاجر المضافة</Text>
      <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {recentStores.map((s) => (
          <View key={s.id} style={[styles.row, { borderTopColor: colors.border }]}>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>{s.name}</Text>
              <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                {s.storeType} · {fmtDate((s as any).createdAt)}
              </Text>
            </View>
            <View style={[styles.daysPill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.daysText, { color: colors.mutedForeground }]}>{s.status}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
    marginTop: 24,
    marginBottom: 16,
  },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
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
  statContent: { flex: 1, alignItems: 'flex-start', gap: 4 },
  statValue: { fontFamily: fonts.bold, fontSize: 18 },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, textAlign: 'right' },
  listCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginTop: 4 },
  listHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  listTitle: { fontFamily: fonts.bold, fontSize: 14 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  rowInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  rowName: { fontFamily: fonts.bold, fontSize: 14, textAlign: 'right' },
  rowMeta: { fontFamily: fonts.medium, fontSize: 12, textAlign: 'right' },
  daysPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 52,
    alignItems: 'center',
  },
  daysText: { fontFamily: fonts.bold, fontSize: 11 },
  storeRevenue: { fontFamily: fonts.bold, fontSize: 14 },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
