import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Linking } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useListStoreOrders, useListStoreDrivers, useAssignOrderDriver } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';
import { shortenUrl } from '@/lib/shortenUrl';

// Builds the wa.me click-to-chat text sent to a delivery driver: everything
// they need to pick up and deliver the order (no extra WhatsApp API/business
// account required for this — the merchant taps and sends it themselves).
async function buildDriverMessage(item: {
  id: number;
  storeOrderNumber?: number | null;
  customerPhone: string;
  items?: Array<{ name: string; qty: number }> | null;
  total: number;
  latitude?: number | null;
  longitude?: number | null;
  note?: string | null;
}): Promise<string> {
  const displayNumber = item.storeOrderNumber ?? item.id;
  const lines = (item.items ?? []).map((i) => `• ${i.name} × ${i.qty}`).join('\n');
  let mapsLink = '';
  if (item.latitude != null && item.longitude != null) {
    const shortUrl = await shortenUrl(`https://maps.google.com/?q=${item.latitude},${item.longitude}`);
    mapsLink = `\n📍 فتح موقع الزبون:\n${shortUrl}`;
  }
  return (
    `🚚 *طلب توصيل #${displayNumber}*\n` +
    `📞 الزبون: ${item.customerPhone}\n\n` +
    `${lines}\n\n` +
    `💰 الإجمالي: ${item.total.toLocaleString('ar-IQ')} د.ع` +
    (item.note ? `\n📝 ملاحظة: ${item.note}` : '') +
    mapsLink
  );
}

export function MerchantOrders({ storeId }: { storeId: number }) {
  const colors = useColors();
  const query = useListStoreOrders(storeId);
  const driversQuery = useListStoreDrivers(storeId);
  const assignDriver = useAssignOrderDriver();
  const activeDrivers = (driversQuery.data ?? []).filter((d) => d.status === 'مفعّل');
  const [pickerForOrder, setPickerForOrder] = useState<number | null>(null);
  const [sendingTo, setSendingTo] = useState<number | null>(null);

  const sendToDriver = async (
    order: Parameters<typeof buildDriverMessage>[0],
    driver: { id: number; phone: string },
  ) => {
    setSendingTo(driver.id);
    try {
      // Persist the assignment first so the driver's busy/free status is
      // accurate right away, then open the chat with the order's details.
      await assignDriver.mutateAsync({ id: order.id, data: { driverId: driver.id } });
      const text = encodeURIComponent(await buildDriverMessage(order));
      const digits = driver.phone.replace(/\D/g, '');
      await Linking.openURL(`https://wa.me/${digits}?text=${text}`);
      setPickerForOrder(null);
      query.refetch();
      driversQuery.refetch();
    } catch (err: any) {
      Alert.alert('تعذر الإرسال', err?.data?.error ?? 'تأكد من تثبيت واتساب على جهازك');
    } finally {
      setSendingTo(null);
    }
  };

  const handleSendPress = (order: Parameters<typeof buildDriverMessage>[0]) => {
    if (activeDrivers.length === 0) {
      Alert.alert('لا يوجد مندوبين', 'أضف مندوب توصيل من تبويب "المندوبين" أولاً');
      return;
    }
    setPickerForOrder(order.id);
  };

  const statusColor = (status: string) =>
    status === 'تم التوصيل' || status === 'مكتمل'
      ? colors.primary
      : status === 'ملغي' || status === 'مرفوض'
        ? colors.destructive
        : colors.accent;

  const deliveryLabel = (type: string) =>
    type === 'express' ? 'توصيل سريع' : 'توصيل عادي';

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={
        <View style={{ marginTop: 40 }}>
          <EmptyState icon="clipboard" title="لا توجد طلبات بعد" />
        </View>
      }
      renderItem={({ item }) => {
        const sc = statusColor(item.status);
        const itemCount = item.items?.length ?? 0;
        const summary = (item.items ?? [])
          .map((it) => `${it.name} ×${it.qty}`)
          .join(' · ');
        return (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.topRow}>
              <View style={[styles.statusPill, { backgroundColor: sc + '20' }]}>
                <Text style={[styles.statusText, { color: sc }]}>{item.status}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <Text style={[styles.orderId, { color: colors.foreground }]}>
                  طلب رقم #{item.storeOrderNumber ?? item.id}
                </Text>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {String(item.createdAt).slice(0, 10)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detail, { color: colors.mutedForeground }]}>{item.customerPhone}</Text>
              <Feather name="phone" size={13} color={colors.mutedForeground} />
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detail, { color: colors.mutedForeground }]}>
                {itemCount} صنف
              </Text>
              <Feather name="package" size={13} color={colors.mutedForeground} />
            </View>

            {summary ? (
              <Text style={[styles.summary, { color: colors.mutedForeground }]} numberOfLines={2}>
                {summary}
              </Text>
            ) : null}

            <View style={styles.detailRow}>
              <Text style={[styles.detail, { color: colors.mutedForeground }]}>{deliveryLabel(item.deliveryType)}</Text>
              <Feather name="truck" size={13} color={colors.mutedForeground} />
            </View>

            {item.note ? (
              <View style={[styles.noteBox, { backgroundColor: colors.muted }]}>
                <Text style={[styles.noteText, { color: colors.foreground }]}>{item.note}</Text>
              </View>
            ) : null}

            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalValue, { color: colors.primary }]}>{formatIQD(item.total)}</Text>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>الإجمالي</Text>
            </View>

            <Pressable
              onPress={() => handleSendPress(item)}
              style={({ pressed }) => [
                styles.driverBtn,
                { backgroundColor: colors.primary + '15', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="truck" size={14} color={colors.primary} />
              <Text style={[styles.driverBtnText, { color: colors.primary }]}>إرسال إلى مندوب التوصيل</Text>
            </Pressable>

            {pickerForOrder === item.id ? (
              <View style={[styles.driverPicker, { borderColor: colors.border }]}>
                {activeDrivers.map((d) => {
                  const busy = d.activeOrderId != null && d.activeOrderId !== item.id;
                  const sending = sendingTo === d.id;
                  return (
                    <Pressable
                      key={d.id}
                      disabled={sending}
                      onPress={() => sendToDriver(item, d)}
                      style={[styles.driverOption, { backgroundColor: colors.muted, opacity: sending ? 0.6 : 1 }]}
                    >
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={[styles.driverOptionText, { color: colors.foreground }]}>{d.name}</Text>
                        <Text style={[styles.driverOptionPhone, { color: colors.mutedForeground }]}>
                          {d.phone}{d.vehicleType ? ` · ${d.vehicleType}` : ''}
                        </Text>
                      </View>
                      {sending ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={[styles.driverBusyTag, { color: busy ? colors.destructive : colors.primary }]}>
                          {busy ? 'مشغول' : 'متاح'}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 20, paddingBottom: 60 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  orderId: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  date: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  detail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'right',
  },
  summary: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 19,
  },
  noteBox: {
    borderRadius: 10,
    padding: 10,
  },
  noteText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 19,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  totalValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  driverBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    marginTop: 4,
  },
  driverBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
  },
  driverPicker: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  driverOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  driverOptionText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  driverOptionPhone: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  driverBusyTag: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
});
