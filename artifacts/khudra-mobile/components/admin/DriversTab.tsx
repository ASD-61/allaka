import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useListAllDrivers, useSetDriverStatus, useDeleteDriver } from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';

// Read-only oversight of every merchant-added delivery driver across every
// store — merchants approve their own drivers now (a driver is usable the
// moment they add it), so the admin's role here is just monitoring, with the
// ability to suspend a driver in case of abuse or delete their record.
export function DriversTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const query = useListAllDrivers({ request: adminRequest });
  const setStatus = useSetDriverStatus({ request: adminRequest });
  const deleteDriver = useDeleteDriver({ request: adminRequest });

  const toggleStatus = (id: number, current: string) => {
    setStatus.mutate(
      { driverId: id, data: { status: current === 'مفعّل' ? 'موقوف' : 'مفعّل' } },
      {
        onSuccess: () => query.refetch(),
        onError: (err: any) => Alert.alert('خطأ', err?.data?.error ?? 'تعذر تحديث حالة المندوب'),
      },
    );
  };

  const remove = (id: number, name: string) => {
    Alert.alert('حذف المندوب', `هل تريد حذف "${name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () =>
          deleteDriver.mutate(
            { driverId: id },
            {
              onSuccess: () => query.refetch(),
              onError: (err: any) => Alert.alert('تعذر الحذف', err?.data?.error ?? 'تعذر حذف المندوب'),
            },
          ),
      },
    ]);
  };

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      onRefresh={() => query.refetch()}
      refreshing={query.isFetching}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 4 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>كل مندوبي التوصيل</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            كل تاجر يضيف ويوافق على مندوبيه بنفسه — هذا العرض للمتابعة فقط، وتقدر توقف أي مندوب عند سوء الاستخدام.
          </Text>
        </View>
      }
      ListEmptyComponent={
        query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ marginTop: 20 }}>
            <EmptyState icon="truck" title="لا يوجد مندوبين بعد" />
          </View>
        )
      }
      renderItem={({ item }) => {
        const isActive = item.status === 'مفعّل';
        return (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.phone, { color: colors.mutedForeground }]}>{item.phone}</Text>
              {item.vehicleType ? (
                <Text style={[styles.phone, { color: colors.mutedForeground }]}>{item.vehicleType}</Text>
              ) : null}
              <Text style={[styles.storeName, { color: colors.mutedForeground }]}>
                متجر: {(item as { storeName?: string }).storeName ?? '—'}
              </Text>
              <View style={{ flexDirection: 'row-reverse', gap: 6, marginTop: 2 }}>
                <View style={[styles.pill, { backgroundColor: (isActive ? colors.primary : colors.destructive) + '20' }]}>
                  <Text style={[styles.pillText, { color: isActive ? colors.primary : colors.destructive }]}>
                    {isActive ? 'مفعّل' : 'موقوف'}
                  </Text>
                </View>
                {item.available === false ? (
                  <View style={[styles.pill, { backgroundColor: colors.mutedForeground + '20' }]}>
                    <Text style={[styles.pillText, { color: colors.mutedForeground }]}>غير متاح (بنفسه)</Text>
                  </View>
                ) : item.activeOrderId != null ? (
                  <View style={[styles.pill, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.pillText, { color: colors.accent }]}>مشغول — طلب #{item.activeOrderId}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => toggleStatus(item.id, item.status)}
                style={[styles.actionBtn, { backgroundColor: (isActive ? colors.destructive : colors.primary) + '15' }]}
              >
                <Feather name={isActive ? 'pause-circle' : 'play-circle'} size={16} color={isActive ? colors.destructive : colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => remove(item.id, item.name)}
                style={[styles.actionBtn, { backgroundColor: colors.destructive + '15' }]}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
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
    fontSize: 16,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
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
  storeName: {
    fontFamily: fonts.medium,
    fontSize: 11,
    textAlign: 'right',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
