import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useListStoreCustomers } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { resolveImageUrl } from '@/lib/image-url';
import { EmptyState } from '@/components/EmptyState';

export function MerchantCustomers({ storeId }: { storeId: number }) {
  const colors = useColors();
  const query = useListStoreCustomers(storeId);

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
      keyExtractor={(item) => item.phone}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={
        <View style={{ marginTop: 40 }}>
          <EmptyState icon="users" title="لا يوجد زبائن بعد" />
        </View>
      }
      renderItem={({ item }) => {
        const avatar = resolveImageUrl(item.avatarUrl);
        return (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.topRow}>
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Feather name="user" size={22} color={colors.mutedForeground} />
                )}
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name || item.phone}
                </Text>
                <Text style={[styles.phone, { color: colors.mutedForeground }]}>{item.phone}</Text>
              </View>
            </View>

            <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{item.orderCount} طلب</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>عدد الطلبات</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{formatIQD(item.totalSpent)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>إجمالي الصرف</Text>
              </View>
              {item.lastOrderAt ? (
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {String(item.lastOrderAt).slice(0, 10)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>آخر طلب</Text>
                </View>
              ) : null}
            </View>
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
    gap: 12,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  statsRow: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    textAlign: 'right',
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
  },
});
