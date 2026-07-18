import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Alert } from '@/lib/alert';
import { Feather } from '@expo/vector-icons';
import { useListPendingDrivers, useReviewDriver } from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { EmptyState } from '@/components/EmptyState';

// Admin review queue for merchant-added delivery drivers ("مندوبين"). A
// driver only becomes usable (the merchant can forward orders to them on
// WhatsApp) once approved here.
export function DriversTab() {
  const colors = useColors();
  const adminRequest = useAdminRequest();
  const query = useListPendingDrivers({ request: adminRequest });
  const review = useReviewDriver({ request: adminRequest });

  const decide = (id: number, action: 'approve' | 'reject') => {
    review.mutate(
      { driverId: id, data: { action } },
      {
        onSuccess: () => query.refetch(),
        onError: (err: any) => Alert.alert('خطأ', err?.data?.error ?? 'تعذر تحديث حالة المندوب'),
      },
    );
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
        <Text style={[styles.title, { color: colors.foreground }]}>مندوبون بانتظار الموافقة</Text>
      }
      ListEmptyComponent={
        query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ marginTop: 20 }}>
            <EmptyState icon="truck" title="لا يوجد مندوبين بانتظار المراجعة" />
          </View>
        )
      }
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
            <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.phone, { color: colors.mutedForeground }]}>{item.phone}</Text>
            <Text style={[styles.storeName, { color: colors.mutedForeground }]}>
              متجر: {(item as { storeName?: string }).storeName ?? '—'}
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={() => decide(item.id, 'approve')}
              style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
            >
              <Feather name="check" size={16} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => decide(item.id, 'reject')}
              style={[styles.actionBtn, { backgroundColor: colors.destructive + '15' }]}
            >
              <Feather name="x" size={16} color={colors.destructive} />
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 60 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 14,
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
  actions: {
    flexDirection: 'row',
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
