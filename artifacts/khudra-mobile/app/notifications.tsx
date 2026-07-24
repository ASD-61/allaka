import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useListNotifications } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';
import { checkForUpdate, type UpdateInfo } from '@/lib/appUpdate';

export default function NotificationsScreen() {
  const colors = useColors();
  const query = useListNotifications();

  // Show a persistent "update available" card at the top whenever the server
  // reports a newer app version — this is the in-app update notice (it stays
  // visible here as long as a newer version exists, unlike the one-time alert
  // shown on the home screen).
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  useEffect(() => {
    let alive = true;
    checkForUpdate()
      .then((info) => {
        if (alive) setUpdate(info);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={() => query.refetch()}
        refreshing={query.isFetching}
        ListHeaderComponent={
          update ? (
            <Pressable
              onPress={() => Linking.openURL(update.apkUrl).catch(() => {})}
              style={({ pressed }) => [
                styles.updateCard,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <View style={styles.updateIcon}>
                <Feather name="download" size={18} color={colors.primary} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.updateTitle, { color: colors.primaryForeground }]}>
                  تحديث جديد متوفر (نسخة {update.latestVersion})
                </Text>
                <Text style={[styles.updateBody, { color: colors.primaryForeground }]} numberOfLines={2}>
                  {update.message} · اضغط للتحديث الآن
                </Text>
              </View>
              <Feather name="chevron-left" size={20} color={colors.primaryForeground} />
            </Pressable>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          // `data` is returned by the API for stored notifications (order/refund/
          // delivery). The generated type doesn't include it, so read at runtime.
          const data = (item as any).data as
            | { role?: string; storeId?: number; orderId?: number }
            | undefined;
          const isMerchantOrder = data?.role === 'merchant' && data?.storeId != null;
          const openable = isMerchantOrder;
          const onOpen = () => {
            if (isMerchantOrder) {
              router.push(`/my-store/${data!.storeId}` as any);
            }
          };
          return (
            <Pressable
              onPress={openable ? onOpen : undefined}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed && openable ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name={isMerchantOrder ? 'shopping-bag' : 'bell'} size={16} color={colors.accent} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.message, { color: colors.foreground }]}>{item.message}</Text>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              {openable ? (
                <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              ) : null}
            </Pressable>
          );
        }}
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
  updateCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  updateIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
  },
  updateBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
    marginTop: 2,
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
