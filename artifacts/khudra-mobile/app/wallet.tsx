import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useGetWallet } from '@workspace/api-client-react';
import { ZoomableImage } from '@/components/ZoomableImage';
import { resolveImageUrl } from '@/lib/image-url';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/fonts';
import { formatIQD } from '@/lib/format';
import { RequireAuth } from '@/components/RequireAuth';
import { EmptyState } from '@/components/EmptyState';

function WalletContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const walletQuery = useGetWallet();

  const general = walletQuery.data?.generalBalance ?? 0;
  const stores = walletQuery.data?.stores ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'محفظتي' }} />

      <FlatList
        data={stores}
        keyExtractor={(item) => String(item.storeId)}
        contentContainerStyle={styles.list}
        refreshing={walletQuery.isFetching}
        onRefresh={() => walletQuery.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.generalCard, { backgroundColor: colors.primary }]}>
              <Feather name="credit-card" size={22} color={colors.primaryForeground} />
              <Text style={[styles.generalLabel, { color: colors.primaryForeground }]}>
                رصيد عام (يُستخدم بأي متجر)
              </Text>
              <Text style={[styles.generalAmount, { color: colors.primaryForeground }]}>
                {formatIQD(general)}
              </Text>
            </View>
            {stores.length > 0 ? (
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                رصيد حسب المتجر
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.storeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.storeBalance, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.storeBalanceText, { color: colors.primary }]}>
                {formatIQD(item.balance)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
                {item.storeName}
              </Text>
              {((item as any).points ?? 0) > 0 ? (
                <View style={styles.pointsPill}>
                  <Feather name="award" size={11} color={colors.accent} />
                  <Text style={[styles.pointsPillText, { color: colors.mutedForeground }]}>
                    {(item as any).points} نقطة
                  </Text>
                </View>
              ) : null}
            </View>
            {item.storeImageUrl ? (
              <ZoomableImage
                uri={resolveImageUrl(item.storeImageUrl)}
                wrapperStyle={styles.storeImg}
                style={styles.storeImg}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.storeImg, styles.storeImgFallback, { backgroundColor: colors.primary + '15' }]}>
                <Feather name="shopping-bag" size={18} color={colors.primary} />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          walletQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon="credit-card"
              title="ما عندك رصيد بمتجر بعد"
              subtitle="رصيد المتاجر ينضاف من التعويضات، ويُستخدم بنفس المتجر فقط"
            />
          )
        }
      />
    </View>
  );
}

export default function WalletScreen() {
  return (
    <RequireAuth message="سجّل دخولك لعرض محفظتك">
      <WalletContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  header: { gap: 16, marginBottom: 4 },
  generalCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'flex-end',
    gap: 6,
  },
  generalLabel: { fontFamily: fonts.medium, fontSize: 13 },
  generalAmount: { fontFamily: fonts.bold, fontSize: 26 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, textAlign: 'right' },
  storeCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  storeImg: { width: 48, height: 48, borderRadius: 10 },
  storeImgFallback: { alignItems: 'center', justifyContent: 'center' },
  storeName: { fontFamily: fonts.bold, fontSize: 15, textAlign: 'right' },
  pointsPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  pointsPillText: { fontFamily: fonts.semibold, fontSize: 11 },
  storeBalance: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  storeBalanceText: { fontFamily: fonts.bold, fontSize: 14 },
});
