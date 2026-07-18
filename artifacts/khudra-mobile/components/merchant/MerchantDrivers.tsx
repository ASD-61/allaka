import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator, Linking } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import {
  useListStoreDrivers,
  useCreateStoreDriver,
  useDeleteDriver,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';
import { schemeForDomain, resolveApiDomain } from '@/lib/api-scheme';

const STATUS_LABEL: Record<string, string> = {
  'مفعّل': 'مفعّل',
  'موقوف': 'موقوف من الإدارة',
};

const VEHICLE_TYPES = ['دراجة نارية', 'سيارة', 'دراجة هوائية'];

function driverPortalUrl(portalToken: string): string {
  const domain = resolveApiDomain();
  return `${schemeForDomain(domain)}://${domain}/driver/${portalToken}`;
}

// Lets a merchant add their own delivery reps ("مندوبين") for this store —
// the merchant themselves is the approver, so a driver is usable immediately
// after adding: no admin review step. The same person can be added as a
// driver by more than one store. Once added, the merchant can forward any
// order to the driver's WhatsApp with one tap from the Orders tab, which
// also shows whether each driver is currently free or out on a delivery.
export function MerchantDrivers({ storeId }: { storeId: number }) {
  const colors = useColors();
  const driversQuery = useListStoreDrivers(storeId);
  const createDriver = useCreateStoreDriver();
  const deleteDriver = useDeleteDriver();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim() || !vehicleType.trim()) return;
    try {
      await createDriver.mutateAsync({
        id: storeId,
        data: { name: name.trim(), phone: phone.trim(), vehicleType: vehicleType.trim() },
      });
      setName('');
      setPhone('');
      driversQuery.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر إضافة المندوب');
    }
  };

  const statusColor = (status: string) => (status === 'مفعّل' ? colors.primary : colors.destructive);

  const sendPortalLink = (driver: { phone: string; name: string; portalToken: string }) => {
    const url = driverPortalUrl(driver.portalToken);
    const text = encodeURIComponent(
      `مرحباً ${driver.name} 👋\nهذا رابطك الخاص للتحكم بحالة استلام الطلبات (متاح / غير متاح) بنفسك في أي وقت:\n${url}`,
    );
    const digits = driver.phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${digits}?text=${text}`).catch(() =>
      Alert.alert('تعذر الفتح', 'تأكد من تثبيت واتساب على جهازك'),
    );
  };

  const drivers = driversQuery.data ?? [];

  return (
    <FlatList
      data={drivers}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>مندوبو التوصيل</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            أضف مندوبين للتوصيل حتى تقدر ترسل لهم تفاصيل أي طلب على الواتساب مباشرة. المندوب يصير جاهز للاستخدام فوراً بمجرد إضافته، ويقدر هو نفسه يفعّل أو يوقف استلام الطلبات من رابطه الخاص (اضغط "إرسال رابط التحكم" تحت اسمه لإرساله له).
          </Text>
          <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="اسم المندوب"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              textAlign="right"
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="رقم واتساب المندوب (مثال: 07811772240)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              textAlign="right"
              onSubmitEditing={handleAdd}
            />
            <View style={styles.vehicleRow}>
              {VEHICLE_TYPES.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setVehicleType(v)}
                  style={[
                    styles.vehicleChip,
                    {
                      backgroundColor: vehicleType === v ? colors.primary : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.vehicleChipText,
                      { color: vehicleType === v ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={handleAdd}
              disabled={createDriver.isPending || !name.trim() || !phone.trim() || !vehicleType.trim()}
              style={[
                styles.addBtn,
                {
                  backgroundColor: colors.primary,
                  opacity:
                    createDriver.isPending || !name.trim() || !phone.trim() || !vehicleType.trim() ? 0.5 : 1,
                },
              ]}
            >
              {createDriver.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <>
                  <Feather name="plus" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>إضافة مندوب</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={
        driversQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ marginTop: 20 }}>
            <EmptyState icon="truck" title="لا يوجد مندوبين بعد" subtitle="أضف أول مندوب من الحقل أعلاه" />
          </View>
        )
      }
      renderItem={({ item }) => {
        const sc = statusColor(item.status);
        return (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              hitSlop={8}
              onPress={() =>
                Alert.alert('حذف المندوب', `هل تريد حذف "${item.name}"؟`, [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: () =>
                      deleteDriver.mutate(
                        { driverId: item.id },
                        {
                          onSuccess: () => driversQuery.refetch(),
                          onError: (err: any) =>
                            Alert.alert('تعذر الحذف', err?.data?.error ?? 'تعذر حذف المندوب'),
                        },
                      ),
                  },
                ])
              }
              style={({ pressed }) => [
                styles.deleteBtn,
                { backgroundColor: colors.destructive + '15', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.phone, { color: colors.mutedForeground }]}>{item.phone}</Text>
              {item.vehicleType ? (
                <Text style={[styles.phone, { color: colors.mutedForeground }]}>{item.vehicleType}</Text>
              ) : null}
              <View style={{ flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' }}>
                <View style={[styles.statusPill, { backgroundColor: sc + '20' }]}>
                  <Text style={[styles.statusText, { color: sc }]}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
                {item.available === false ? (
                  <View style={[styles.statusPill, { backgroundColor: colors.mutedForeground + '20' }]}>
                    <Text style={[styles.statusText, { color: colors.mutedForeground }]}>غير متاح اليوم (بنفسه)</Text>
                  </View>
                ) : item.activeOrderId != null ? (
                  <View style={[styles.statusPill, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.statusText, { color: colors.accent }]}>مشغول — طلب #{item.activeOrderId}</Text>
                  </View>
                ) : (
                  <View style={[styles.statusPill, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.statusText, { color: colors.primary }]}>متاح</Text>
                  </View>
                )}
              </View>
              {item.portalToken ? (
                <Pressable
                  hitSlop={6}
                  onPress={() => sendPortalLink(item)}
                  style={({ pressed }) => [styles.portalLinkBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Feather name="link" size={12} color={colors.accent} />
                  <Text style={[styles.portalLinkText, { color: colors.accent }]}>
                    إرسال رابط التحكم بالحالة للمندوب
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="truck" size={18} color={colors.mutedForeground} />
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 60 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  addCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  vehicleRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  vehicleChipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
  },
  addBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  phone: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 2,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
  },
  portalLinkBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  portalLinkText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
});
