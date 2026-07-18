import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useListNotifications } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';

export default function NotificationsScreen() {
  const colors = useColors();
  const query = useListNotifications();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={() => query.refetch()}
        refreshing={query.isFetching}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <Feather name="bell" size={16} color={colors.accent} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.message, { color: colors.foreground }]}>{item.message}</Text>
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon="bell-off" title="لا توجد إشعارات" subtitle="ستظهر هنا آخر تحديثات طلباتك" />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  message: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 19,
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
  },
});
