import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
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

const STATUS_LABEL: Record<string, string> = {
  'قيد المراجعة': 'بانتظار موافقة الإدارة',
  'مفعّل': 'مفعّل',
  'مرفوض': 'مرفوض',
};

// Lets a merchant add their own delivery reps ("مندوبين") for this store.
// Each one starts pending until an admin approves them — same review flow as
// stores themselves — after which the merchant can forward any order to the
// driver's WhatsApp with one tap from the Orders tab.
export function MerchantDrivers({ storeId }: { storeId: number }) {
  const colors = useColors();
  const driversQuery = useListStoreDrivers(storeId);
  const createDriver = useCreateStoreDriver();
  const deleteDriver = useDeleteDriver();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    try {
      await createDriver.mutateAsync({ id: storeId, data: { name: name.trim(), phone: phone.trim() } });
      setName('');
      setPhone('');
      driversQuery.refetch();
    } catch (err: any) {
      Alert.alert('خطأ', err?.data?.error ?? 'تعذر إضافة المندوب');
    }
  };

  const statusColor = (status: string) =>
    status === 'مفعّل' ? colors.primary : status === 'مرفوض' ? colors.destructive : colors.accent;

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
            أضف مندوبين للتوصيل حتى تقدر ترسل لهم تفاصيل أي طلب على الواتساب مباشرة. لازم تُفعّل من الإدارة أولاً.
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
            <Pressable
              onPress={handleAdd}
              disabled={createDriver.isPending || !name.trim() || !phone.trim()}
              style={[
                styles.addBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: createDriver.isPending || !name.trim() || !phone.trim() ? 0.5 : 1,
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
              <View style={[styles.statusPill, { backgroundColor: sc + '20' }]}>
                <Text style={[styles.statusText, { color: sc }]}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
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
});
